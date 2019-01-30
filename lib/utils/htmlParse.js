const parse5 = require('parse5');
const { LINK, SCRIPT } = require('../const');

module.exports = function parse(html) {
  const root = parse5.parse(html);
  const list = [];
  function reducer(node) {
    if (node.tagName === LINK || node.tagName === SCRIPT) {
      list.push(node);
    }
    if (node.childNodes) {
      node.childNodes.forEach(reducer);
    }
  }
  reducer(root);
  return { list, root };
};
