const fs = require("fs-extra")

exports.onPreInit = async ({reporter}) => {
  if (fs.existsSync("node_modules/.cache/gatsby-source-strava")) {
    reporter.log("onPreInit: Copying gatsby-source-strava cache to .cache")
    await fs.copy(
      "node_modules/.cache/gatsby-source-strava",
      ".cache/gatsby-source-strava"
    )
  }
}
