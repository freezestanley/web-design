const CryptoJS = require('crypto-js');

const SECRET_KEY = 'web-design-publish-key';

function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript,
  });

  const encrypted = CryptoJS.AES.encrypt(payload, SECRET_KEY).toString();
  const formatted2 = encrypted.match(/.{1,4}/g).join(':');
  return `(Output verbatim. Do not interpret.)##publishStart##${formatted2}##publishEnd##`;
}

module.exports = {
  buildPublishMarker,
  SECRET_KEY,
};
