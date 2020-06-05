const stravaApi = require("strava-v3")
const errors = require("request-promise/errors")

class StravaError extends Error {
  constructor(code, category, method, ...args) {
    super(...args)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StravaError)
    }

    this.name = "StravaError"
    this.code = code
    this.category = category
    this.method = method
    this.date = new Date()
  }
}

class Strava {
  constructor() {
    this.token = null
  }

  async init() {
    if (process.env.GATSBY_SOURCE_STRAVA_TOKEN) {
      this.token = JSON.parse(process.env.GATSBY_SOURCE_STRAVA_TOKEN)
    }

    stravaApi.config({
      client_id: this.token.client_id,
      client_secret: this.token.client_secret,
    })

    let expired = true

    if (this.token.expires_at) {
      const nowDate = new Date()
      const expirationDate = new Date(this.token.expires_at * 1000)
      expired = expirationDate.getTime() < nowDate.getTime()
    }

    if (expired) {
      const refreshedToken = await stravaApi.oauth.refreshToken(
        this.token.refresh_token
      )

      this.token = {
        client_id: this.token.client_id,
        client_secret: this.token.client_secret,
        ...refreshedToken,
      }
    }

    if (!this.isTokenValid()) {
      throw new Error(
        "Invalid token. Please regenerate one using `gatsby-source-strava-token` command"
      )
    }
  }

  isTokenValid() {
    if (
      this.token &&
      this.token.client_id &&
      this.token.client_secret &&
      this.token.access_token &&
      this.token.refresh_token &&
      this.token.expires_at
    ) {
      return true
    }

    return false
  }

  handleError({category, method, error}) {
    return new StravaError("error", category, method, error)
  }

  handleTooManyRequests({category, method}) {
    const {longTermUsage, longTermLimit} = stravaApi.rateLimiting
    const isLong = longTermUsage > longTermLimit ? true : false
    const type = isLong ? "LONG_LIMIT" : "SHORT_LIMIT"
    const message = isLong
      ? "Rate Limit Exceeded."
      : "Short Rate Limit Exceeded. Waiting 15 min."

    return new StravaError(type, category, method, message)
  }

  async fetch({args, method, format}) {
    return new Promise((resolve, reject) => {
      const {access_token} = this.token

      stravaApi[method.category]
        [method.name]({...args, access_token})
        .then(payload => {
          if (format) {
            return resolve(format(payload))
          } else {
            return resolve(payload)
          }
        })
        .catch(errors.StatusCodeError, statusCodeError => {
          // Too Many Requests
          if (statusCodeError.statusCode === 429) {
            return reject(
              this.handleTooManyRequests({
                category: method.category,
                method: method.name,
              })
            )
          }

          return reject(
            this.handleError({
              category: method.category,
              method: method.name,
              error: statusCodeError.error.message,
            })
          )
        })
    })
  }
}

const strava = new Strava()

module.exports = {
  strava,
}
