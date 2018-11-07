const { LINK } = require('./const');

const linkKeys = ['src', 'href', 'content'];
const isLink = attr => linkKeys.find(i => i === attr.name);
const getLink = tag => tag.attrs.find(isLink);
const isStyle = ({ name, attrs }) => name === LINK && attrs.find(i => i.name === 'rel' && i.value === 'stylesheet');
module.exports = { getLink, isLink, isStyle };
