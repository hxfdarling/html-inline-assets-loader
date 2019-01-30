/* eslint-disable global-require */

const fs = require('fs-extra');
const path = require('path');
const loaderUtils = require('loader-utils');
const queryParse = require('query-parse');
const crypto = require('crypto');
const parse5 = require('parse5');
const babel = require('./lib/babel');
const cache = require('./lib/cache');

const htmlParse = require('./lib/htmlParse');
const { getLink, isLink, isStyle, isHtml } = require('./lib/util');
const { SCRIPT } = require('./lib/const');

const varName = '__JS_RETRY__';
module.exports = async function(content) {
  this.cacheable && this.cacheable();
  const callback = this.async();
  const options = loaderUtils.getOptions(this) || {};
  const webpackConfig = this._compiler.parentCompilation.options;
  const { publicPath } = webpackConfig.output;

  const { resource } = this;
  const baseDir = path.dirname(resource);
  const { root, list: nodes } = htmlParse(content);

  await Promise.all(
    nodes.map(async node => {
      const link = getLink(node);
      const temp = link.value.split('?');
      const query = queryParse.toObject(temp[1] || '');
      Object.keys(query).forEach(key => {
        if (query[key] === '') {
          query[key] = true;
        }
      });
      const file = path.resolve(baseDir, temp[0]);
      if (!fs.existsSync(file)) {
        this.emitError(new Error(`not found file: ${temp[0]} \nin ${resource}`));
      } else {
        const { _inline: inline, _dist: dist } = query;
        let result = '';
        const needInclude = !dist || (dist && process.env.NODE_ENV === 'production');
        if (needInclude) {
          const isMiniFile = /\.min\.(js|css)$/.test(file);
          const { nodeName } = node;
          this.addDependency(file);
          result = (await fs.readFile(file)).toString();
          // 只需要转换未压缩的JS
          if (!isMiniFile && nodeName === SCRIPT) {
            if (options.cacheDirectory) {
              result = await cache({
                cacheDirectory: options.cacheDirectory,
                options,
                source: result,
                // eslint-disable-next-line no-shadow
                transform: (source, options) => {
                  return babel(source, options);
                },
              });
            } else {
              result = await babel(result, options);
            }
          }
          // only js/css/html support inline
          if (inline || isHtml(node)) {
            if (nodeName === SCRIPT) {
              node.attrs = [];
              node.childNodes = [{ nodeName: '#text', value: result, parentNode: node }];
            } else if (isStyle(node)) {
              node.nodeName = 'style';
              node.tagName = 'style';
              node.attrs = [{ name: 'type', value: 'text/css' }];
              node.childNodes = [{ nodeName: '#text', value: result, parentNode: node }];
            } else if (isHtml(node)) {
              const htmlDom = parse5.parseFragment(result);
              const { childNodes } = node.parentNode;
              childNodes.splice(childNodes.indexOf(node), 1, ...htmlDom.childNodes);
            } else {
              const msg = `\nonly js/css support inline:${JSON.stringify(
                { tagName: node.tagName, attrs: node.attrs },
                null,
                2
              )}`;
              this.emitWarning(msg);
            }
          } else {
            const Hash = crypto.createHash('md5');
            Hash.update(result);
            const hash = Hash.digest('hex').substr(0, 6);
            const newFileName = `${path.basename(file).split('.')[0]}_${hash}${path.extname(file)}`;

            const newUrl = [publicPath.replace(/\/$/, ''), newFileName].join(publicPath ? '/' : '');
            if (nodeName === SCRIPT) {
              // 添加主域重试需要标记
              result = `var ${varName}=${varName}||{};\n${varName}["${newFileName}"]=true;${result}`;
            }
            this.emitFile(newFileName, result);

            node.attrs = node.attrs.map(i => {
              if (isLink(i)) {
                i.value = newUrl;
              }
              return i;
            });
          }
        } else {
          const { childNodes } = node.parentNode;
          childNodes.splice(childNodes.indexOf(node), 1);
        }
      }
    })
  );

  content = parse5.serialize(root);

  callback(null, content);
};
