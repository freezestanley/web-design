function buildPublishMarker({ author = "", sourceZipPath, distZipPath, projectName, summary }) {
  return `##publishStart##${author}｜${sourceZipPath}｜${distZipPath}｜${projectName}｜${summary}##publishEnd##`;
}

module.exports = {
  buildPublishMarker
};
