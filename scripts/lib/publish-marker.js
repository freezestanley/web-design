function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript,
  });
    const encoded = Buffer.from(encodeURIComponent(payload),'ascii').toString('base64');
    const result = encoded.match(/.{1,4}/g).join('#');
  return `##publishStart##${result}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};


