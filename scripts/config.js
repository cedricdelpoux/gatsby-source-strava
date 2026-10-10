const fs = require("fs")
const path = require("path")

const {to10DigitTimestamp} = require("../utils/timestamp.js")

const CONFIG_FILES = [
  "gatsby-config.js",
  "gatsby-config.cjs",
  "gatsby-config.mjs",
  "gatsby-config.ts",
]

const PACKAGE_NAME = "gatsby-source-strava"

const resolveFrom = (dir, request) => {
  try {
    return fs.realpathSync(require.resolve(request, {paths: [dir]}))
  } catch {
    return null
  }
}

// A site names the plugin by its package name, or by a path when it runs a
// local copy, as the example site does with `require.resolve("..")`. Both
// lead to the main file of this very package.
const isThisPlugin = (configDir, plugin) => {
  const resolve = typeof plugin === "string" ? plugin : plugin && plugin.resolve

  if (!resolve) return false
  if (resolve === PACKAGE_NAME) return true

  const main = fs.realpathSync(require.resolve(path.join(__dirname, "..")))

  return resolveFrom(configDir, resolve) === main
}

// The commands read the plugin options straight from the site's
// `gatsby-config`, so that what they fetch is what a build would have
// fetched, `withStreams` given as a function included, with no second copy of
// the options to keep in step. Returns null when there is no config to read,
// the command then relying on its own options alone.
const loadPluginOptions = ({configPath} = {}) => {
  const file = configPath
    ? path.resolve(configPath)
    : CONFIG_FILES.map((name) => path.resolve(name)).find(fs.existsSync)

  if (!file) return null

  if (!fs.existsSync(file)) {
    throw new Error(`${configPath} does not exist`)
  }

  let config

  try {
    const exported = require(file)

    config = exported && exported.__esModule ? exported.default : exported
  } catch (e) {
    throw new Error(
      `Could not read ${path.basename(file)}: ${e.message}\n` +
        "Pass --no-config to rely on the command line options alone."
    )
  }

  const configDir = path.dirname(file)
  const plugin = ((config && config.plugins) || []).find((entry) =>
    isThisPlugin(configDir, entry)
  )

  if (!plugin) {
    throw new Error(
      `${path.basename(file)} does not use ${PACKAGE_NAME}. ` +
        "Pass --no-config to rely on the command line options alone."
    )
  }

  const options = plugin.options || {}
  const {after, before, ...details} = options.activities || {}

  return {
    after: to10DigitTimestamp(after),
    before: to10DigitTimestamp(before),
    // Only the options `buildActivity` reads, `extend` being applied to the
    // nodes rather than to what is stored
    details: {
      streamsTypes: details.streamsTypes,
      withComments: details.withComments,
      withKudos: details.withKudos,
      withLaps: details.withLaps,
      withPhotos: details.withPhotos,
      withStreams: details.withStreams,
      withZones: details.withZones,
    },
    file,
    // Gatsby runs from the site's root, which is where the plugin resolves
    // its store directory from
    storeDir: path.resolve(configDir, options.storeDir || ".strava"),
  }
}

module.exports = {loadPluginOptions}
