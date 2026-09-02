const path = require("path")

const {createStore} = require("./store.js")

// Only useful in `gatsby develop`: a change made outside Gatsby's own file
// watching, typically `gatsby-source-strava-activity` refetching one activity
// while the dev server is running, would otherwise need a full restart to
// show up. Replaying every activity on any change is cheap, local JSON files
// and no Strava request, and safe: `createNode` is a no-op for one whose
// `contentDigest` did not change, so only the one that actually did triggers
// a re-render.
const REPLAY_DEBOUNCE_MS = 300

const watchStore = ({
  storeDir,
  actions,
  createActivityNode,
  getNode,
  reporter,
}) => {
  // Only `require()`-d here, never at the top of the file, so that `gatsby
  // build` — which never calls this function — does not need it resolvable
  const chokidar = require("chokidar")

  const store = createStore({dir: storeDir})
  const pattern = path.join(storeDir, "activities", "*.json")

  let timer = null

  const replay = async () => {
    const activities = await store.readActivities()

    activities.forEach(createActivityNode)

    reporter.info(`source-strava: ${activities.length} activities replayed`)
  }

  const debouncedReplay = () => {
    clearTimeout(timer)
    timer = setTimeout(replay, REPLAY_DEBOUNCE_MS)
  }

  chokidar
    .watch(pattern, {ignoreInitial: true})
    .on("add", debouncedReplay)
    .on("change", debouncedReplay)
    .on("unlink", (file) => {
      const node = getNode(path.basename(file, ".json"))

      if (node) {
        actions.deleteNode(node)
      }
    })

  reporter.info(
    `source-strava: watching ${path.relative(process.cwd(), storeDir)} for changes`
  )
}

module.exports = {watchStore}
