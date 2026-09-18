const fs = require("fs")
const path = require("path")

// Activities are kept outside the Gatsby cache on purpose. Gatsby empties its
// own cache whenever a dependency, `package.json`, `gatsby-config.js` or
// `gatsby-node.js` changes, and a continuous integration job never has one:
// this store is what keeps a Strava history from being fetched over and over
// against a quota of 1000 requests a day. It is only emptied by hand.
const createStore = ({dir}) => {
  const activitiesDir = path.join(dir, "activities")
  const stateFile = path.join(dir, "state.json")
  const athleteFile = path.join(dir, "athlete.json")
  const activityFile = (id) => path.join(activitiesDir, `${id}.json`)

  const readJson = async (file) => {
    let content

    try {
      content = await fs.promises.readFile(file, "utf8")
    } catch (e) {
      if (e.code === "ENOENT") return null

      throw e
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error(`${file} is not valid JSON, delete it to fetch it again`)
    }
  }

  // Written next to the target then renamed, so that an interrupted build
  // leaves the previous version behind rather than a truncated file
  const writeJson = async (file, content) => {
    const temporaryFile = `${file}.tmp`

    await fs.promises.mkdir(path.dirname(file), {recursive: true})
    await fs.promises.writeFile(temporaryFile, JSON.stringify(content))
    await fs.promises.rename(temporaryFile, file)
  }

  return {
    dir,

    async readActivities() {
      let files

      try {
        files = await fs.promises.readdir(activitiesDir)
      } catch (e) {
        if (e.code === "ENOENT") return []

        throw e
      }

      const activities = []

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const activity = await readJson(path.join(activitiesDir, file))

        if (activity) activities.push(activity)
      }

      return activities
    },

    async readActivity(id) {
      return readJson(activityFile(id))
    },

    async writeActivity(activity) {
      await writeJson(activityFile(activity.id), activity)
    },

    async readState() {
      return (await readJson(stateFile)) || {}
    },

    async writeState(state) {
      await writeJson(stateFile, state)
    },

    async readAthlete() {
      return readJson(athleteFile)
    },

    async writeAthlete(athlete) {
      await writeJson(athleteFile, athlete)
    },
  }
}

module.exports = {createStore}
