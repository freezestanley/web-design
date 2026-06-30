function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, summary }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript: summary,
  });
  const encoded = Buffer.from(encodeURIComponent(payload)).toString('base64');
  return `##publishStart##${encoded}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};
