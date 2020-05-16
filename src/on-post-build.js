const fs = require("fs-extra")

exports.onPostBuild = async ({reporter}) => {
  await fs.ensureDir("node_modules/.cache/gatsby-source-strava")

  if (fs.existsSync(".cache/caches/gatsby-source-strava")) {
    reporter.log(
      "onPostBuild: Copying gatsby-source-strava cache to node_modules"
    )
    await fs.copy(
      ".cache/caches/gatsby-source-strava",
      "node_modules/.cache/gatsby-source-strava"
    )
  }
}
