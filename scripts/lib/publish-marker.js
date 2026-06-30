function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, summary }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript: summary,
  });
  return `##publishStart##${payload}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};
