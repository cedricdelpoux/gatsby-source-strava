const fs = require("fs")

const to10DigitTimestamp = require("./timestamp.js")

const LAST_FETCH_FILENAME = ".last-fetch.txt"

const readActivitiesFromCache = dir =>
  new Promise(resolve => {
    const activities = []

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    fs.readdir(dir, (err, fileNames) => {
      fileNames.forEach(fileName => {
        if (fileName !== LAST_FETCH_FILENAME) {
          const activity = JSON.parse(
            fs.readFileSync(`${dir}/${fileName}`, "utf-8")
          )

          activities.push(activity)
        }
      })

      resolve(activities)
    })
  })

const readLastFetchFromCache = dir =>
  new Promise(resolve => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    if (fs.existsSync(`${dir}/${LAST_FETCH_FILENAME}`)) {
      const lastFetched = fs.readFileSync(
        `${dir}/${LAST_FETCH_FILENAME}`,
        "utf-8"
      )
      resolve(to10DigitTimestamp(lastFetched))
    } else {
      resolve(null)
    }
  })

const writeActivityToCache = (dir, activity) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  fs.writeFileSync(`${dir}/${activity.id}.json`, JSON.stringify(activity))
}

const writeLastFetchToCache = (dir, lastFetch) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  fs.writeFileSync(
    `${dir}/${LAST_FETCH_FILENAME}`,
    to10DigitTimestamp(lastFetch)
  )
}

module.exports = {
  readActivitiesFromCache,
  readLastFetchFromCache,
  writeActivityToCache,
  writeLastFetchToCache,
}
