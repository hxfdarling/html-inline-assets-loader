/* eslint-disable global-require */

const fs = require('fs-extra');
const path = require('path');
const loaderUtils = require('loader-utils');
const queryParse = require('query-parse');
const crypto = require('crypto');
const { transform } = require('@babel/core');

const attrParse = require('./lib/attributesParser');
const { getLink, isLink, isStyle } = require('./lib/util');
const { SCRIPT } = require('./lib/const');

module.exports = async function(content) {
  this.cacheable && this.cacheable();
  const callback = this.async();
  const options = loaderUtils.getOptions(this) || {};
  const webpackConfig = this._compiler.parentCompilation.options;
  const { publicPath } = webpackConfig.output;

  const { resource } = this;

  const dir = path.dirname(resource);
  const tags = attrParse(content).filter(tag => {
    const link = getLink(tag);
    if (loaderUtils.isUrlRequest(link.value, dir)) {
      return true;
    }
  });

  const babelOptions = {
    minified: options.minimize,
    presets: [
      [
        require('@babel/preset-env').default,
        {
          // no longer works with IE 9
          targets: {
            ie: 9,
          },
          // Users cannot override this behavior because this Babel
          // configuration is highly tuned for ES5 support
          ignoreBrowserslistConfig: true,
        },
      ],
    ],
  };

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
      if (!fs.existsSync(file)) {
        this.emitError(new Error(`not found file: ${temp[0]} \nin ${resource}`));
        tag.code = '';
      } else {
        const { _inline: inline, _dist: dist } = query;
        let result = '';
        const needInclude = !dist || (dist && process.env.NODE_ENV === 'production');
        if (needInclude) {
          const isMiniFile = /\.min\.(js|css)$/.test(file);
          const { name, attrs } = tag;
          this.addDependency(file);
          result = (await fs.readFile(file)).toString();
          // 只需要转换未压缩的JS
          if (!isMiniFile && name === SCRIPT) {
            result = await new Promise((resolve, reject) => {
              transform(result, babelOptions, (err, info) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(info.code);
                }
              });
            });
          }
          // only js/css support inline
          if (inline) {
            if (name === SCRIPT) {
              result = `<script>${result}</script>`;
            } else if (isStyle(tag)) {
              result = `<style type="text/css" >${result}</style>`;
            } else {
              this.emitWarning(`only js/css support inline:${JSON.stringify(tag, null, 2)}`);
              result = `<${name} ${attrs.map(i => `${i.name}="${i.value}"`).join(' ')}/>`;
            }
          } else {
            const Hash = crypto.createHash('md5');
            Hash.update(result);
            const hash = Hash.digest('hex').substr(0, 6);
            const newFileName = `${path.basename(file).split('.')[0]}_${hash}${path.extname(file)}`;

            const newUrl = [publicPath.replace(/\/$/, ''), newFileName].join(publicPath ? '/' : '');

            this.emitFile(newFileName, result);

            result = `<${name} ${attrs
              .map(i => {
                if (isLink(i)) {
                  i.value = newUrl;
                }
                return `${i.name}="${i.value}"`;
              })
              .join(' ')} ></${name}>`;
          }
        }
        tag.code = result;
      }
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
