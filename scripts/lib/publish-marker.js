function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript,
  });
    const encoded = Buffer.from(encodeURIComponent(payload),'ascii').toString('base64');
  return `##publishStart##${encoded}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};


