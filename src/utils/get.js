const strava = require("strava-v3")

const SourceStravaError = require("./error")

const get = ({args, method: {category, name}, format}) =>
  new Promise((resolve, reject) => {
    strava[category][name](args, (err, payload, limits) => {
      const {
        shortTermUsage,
        shortTermLimit,
        longTermUsage,
        longTermLimit,
      } = limits

      if (err) {
        return reject(
          new SourceStravaError(
            "error",
            category,
            name,
            `API error: ${err.msg} during strava.${category}.${name}`
          )
        )
      } else if (shortTermUsage >= shortTermLimit) {
        reject(
          new SourceStravaError(
            "SHORT_LIMIT",
            category,
            name,
            "API short term limit reached. Waiting 15 min."
          )
        )
      } else if (longTermUsage >= longTermLimit) {
        reject(
          new SourceStravaError(
            "LONG_LIMIT",
            category,
            name,
            "API long term limit reached. Stop."
          )
        )
      } else {
        if (format) {
          resolve(format(payload))
        } else {
          resolve(payload)
        }
      }
    })
  })

module.exports = get
