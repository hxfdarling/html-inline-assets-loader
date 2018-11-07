const fs = require('fs-extra');
const path = require('path');
const loaderUtils = require('loader-utils');
const queryParse = require('query-parse');
const { transform } = require('@babel/core');
const crypto = require('crypto');

const attrParse = require('./lib/attributesParser');
const { getLink, isLink, isStyle } = require('./lib/util');
const { SCRIPT } = require('./lib/const');

module.exports = async function(content) {
  this.cacheable && this.cacheable();
  const callback = this.async();

  const webpackConfig = this._compiler.parentCompilation.options;
  const { publicPath } = webpackConfig.output;

  const babelOptions = {
    minified: process.env.NODE_ENV !== 'development',
    // TODO: 支持.babelrc文件中读取配置
    presets: [require.resolve('@babel/preset-env')],
  };
  const { resource } = this;

  const dir = path.dirname(resource);
  const tags = attrParse(content).filter(tag => {
    const link = getLink(tag);
    if (loaderUtils.isUrlRequest(link.value, dir)) {
      return true;
    }
  });

  await Promise.all(
    tags.map(async tag => {
      const link = getLink(tag);
      const temp = link.value.split('?');
      const query = queryParse.toObject(temp[1] || '');
      Object.keys(query).forEach(key => {
        if (query[key] === '') {
          query[key] = true;
        }
      });

      const file = path.resolve(dir, temp[0]);
      let buffer = fs.readFile(file);
      let code = '';

      const { name, attrs } = tag;
      // only js/css support inline
      if (query._inline) {
        if (name === SCRIPT) {
          code = `<script>${transform(buffer, babelOptions).code}</script>`;
        } else if (isStyle(tag)) {
          code = `<style type="text/css" >${buffer}</style>`;
        } else {
          this.emitWarning(`only js/css support inline:${JSON.stringify(tag, null, 2)}`);
          code = `<${name} ${attrs.map(i => `${i.name}=${i.value}`).join(' ')}/>`;
        }
      } else {
        if (tag.name === SCRIPT) {
          buffer = transform(buffer, babelOptions).code;
        }
        const Hash = crypto.createHash('md5');
        Hash.update(buffer);
        const hash = Hash.digest('hex').substr(0, 6);
        const newFileName = `${path.basename(file).split('.')[0]}_${hash}${path.extname(file)}`;
        const newUrl = path.join(publicPath, newFileName);

        this.emitFile(newFileName, buffer);

        code = `<${name} ${attrs
          .map(i => {
            if (isLink(i)) {
              i.value = newUrl;
            }
            return `${i.name}=${i.value}`;
          })
          .join(' ')}}/>`;
      }
      tag.code = code;
    })
  );

  tags.reverse();
  content = [content];
  tags.forEach(tag => {
    const x = content.pop();
    content.push(x.substr(tag.end));
    content.push(tag.code);
    content.push(x.substr(0, tag.start));
  });
  content.reverse();
  content = content.join('');

  callback(null, content);
};
