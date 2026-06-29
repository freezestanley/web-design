function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, summary }) {
  return `##publishStart##${projectUid}｜${sourceZipPath}｜${distZipPath}｜${projectName}｜${summary}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};
