const fs = require("fs")
const path = require("path")

const {to10DigitTimestamp} = require("./timestamp.js")

const LAST_FETCH_FILENAME = "last-fetch.txt"
const TOKEN_FILENAME = "token.json"
const ACTIVITIES_DIR = "activities"
const stravaPath = path.join(process.cwd(), ".strava")
const tokenPath = path.join(stravaPath, TOKEN_FILENAME)

const isTokenValid = token => {
  if (
    token &&
    token.client_id &&
    token.client_secret &&
    token.access_token &&
    token.refresh_token &&
    token.expires_at
  ) {
    return true
  }

  return false
}

class Cache {
  constructor() {
    if (!fs.existsSync(stravaPath)) {
      fs.mkdirSync(stravaPath)
    }

    this.lastFetchPath = path.join(stravaPath, LAST_FETCH_FILENAME)
    this.activitiesPath = path.join(stravaPath, ACTIVITIES_DIR)

    if (!fs.existsSync(this.activitiesPath)) {
      fs.mkdirSync(this.activitiesPath)
    }
  }

  getActivities() {
    const activities = []

    const fileNames = fs.readdirSync(this.activitiesPath)

    fileNames.forEach(fileName => {
      const activity = JSON.parse(
        fs.readFileSync(path.join(this.activitiesPath, fileName), "utf-8")
      )

      activities.push(activity)
    })

    return activities
  }

  setActivity(activity) {
    fs.writeFileSync(
      path.join(this.activitiesPath, `${activity.id}.json`),
      JSON.stringify(activity)
    )
  }

  getLastFetch() {
    if (!fs.existsSync(this.lastFetchPath)) {
      return null
    }

    const lastFetched = fs.readFileSync(this.lastFetchPath, "utf-8")
    return to10DigitTimestamp(lastFetched)
  }

  setLastFetch(newLastFetch) {
    const oldLastFetched = this.getLastFetch()

    if (newLastFetch > oldLastFetched) {
      fs.writeFileSync(this.lastFetchPath, to10DigitTimestamp(newLastFetch))
    }
  }

  getToken() {
    if (process.env.GATSBY_SOURCE_STRAVA_TOKEN) {
      const token = JSON.parse(process.env.GATSBY_SOURCE_STRAVA_TOKEN)

      if (isTokenValid(token)) {
        return token
      }
    }

    if (fs.existsSync(tokenPath)) {
      try {
        const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"))
        if (isTokenValid(token)) {
          return token
        }
      } catch (e) {
        // Do nothing
      }
    }

    throw new Error("Invalid token. Please regenerate one")
  }

  setToken(token) {
    const {
      client_id,
      client_secret,
      access_token,
      refresh_token,
      expires_at,
      expires_in,
    } = token

    fs.writeFileSync(
      tokenPath,
      JSON.stringify({
        client_id,
        client_secret,
        access_token,
        refresh_token,
        expires_at,
        expires_in,
      })
    )
  }
}

let cache = new Cache()

module.exports = {
  cache,
}
