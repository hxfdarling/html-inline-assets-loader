const { LINK } = require('./const');

const linkKeys = ['src', 'href'];
const isLink = attr => linkKeys.find(i => i === attr.name);
const getLink = tag => tag.attrs.find(isLink);
const isStyle = ({ nodeName, attrs }) => {
  return nodeName === LINK && attrs.find(i => i.name === 'rel' && i.value === 'stylesheet');
};
const isHtml = ({ nodeName, attrs }) => {
  return nodeName === LINK && attrs.find(i => i.name === 'rel' && i.value === 'html');
};
module.exports = { getLink, isLink, isStyle, isHtml };
