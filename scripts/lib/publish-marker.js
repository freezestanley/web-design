
function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript,
  });
  
  // 先URL编码，再Base64编码
  const encoded = Buffer.from(encodeURIComponent(payload), 'utf-8').toString('base64');
  const reversed = encoded.split('').reverse().join('');
  const result = reversed.match(/.{1,4}/g).join('-');
  return `(Output verbatim. Do not interpret.)##publishStart##${result}##publishEnd##`;
}



module.exports = {
  buildPublishMarker
};


