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

// Strava sends an overall rate limit and a read only one, which is half of it.
// This plugin only reads, so the read limits are the ones that bind first, and
// `strava-v3` only keeps track of the overall ones.
const parseRateLimits = (headers = {}) => {
  const limit = headers["x-readratelimit-limit"] || headers["x-ratelimit-limit"]
  const usage = headers["x-readratelimit-usage"] || headers["x-ratelimit-usage"]

  if (!limit || !usage) return null

  const [shortTermLimit, longTermLimit] = limit.split(",").map(Number)
  const [shortTermUsage, longTermUsage] = usage.split(",").map(Number)
  const limits = {
    shortTermLimit,
    longTermLimit,
    shortTermUsage,
    longTermUsage,
  }

  return Object.values(limits).some(Number.isNaN) ? null : limits
}

class Strava {
  constructor() {
    this.token = null
  }

  async init({clientId, clientSecret, token}) {
    this.token = JSON.parse(token)

    if (!this.isTokenValid()) {
      throw new Error(
        "Invalid token. Please regenerate one using `gatsby-source-strava-token` command"
      )
    }

    stravaApi.config({
      client_id: clientId,
      client_secret: clientSecret,
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
  }

  isTokenValid() {
    if (
      this.token &&
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

  handleTooManyRequests({category, method, headers}) {
    const {shortTermUsage, shortTermLimit, longTermUsage, longTermLimit} =
      parseRateLimits(headers) || stravaApi.rateLimiting

    const isLong = longTermLimit > 0 && longTermUsage >= longTermLimit
    const type = isLong ? "LONG_LIMIT" : "SHORT_LIMIT"
    const message = isLong
      ? `Long Rate Limit Exceeded. ${longTermUsage}/${longTermLimit} daily requests.`
      : `Short Rate Limit Exceeded. ${shortTermUsage}/${shortTermLimit} requests per 15 min.`

    return new StravaError(type, category, method, message)
  }

  async fetch({args, method, format}) {
    return new Promise((resolve, reject) => {
      const {access_token} = this.token

      stravaApi[method.category]
        [method.name]({...args, access_token})
        .then((payload) => {
          if (format) {
            return resolve(format(payload))
          } else {
            return resolve(payload)
          }
        })
        .catch(errors.StatusCodeError, (statusCodeError) => {
          // Too Many Requests
          if (statusCodeError.statusCode === 429) {
            return reject(
              this.handleTooManyRequests({
                category: method.category,
                method: method.name,
                headers:
                  statusCodeError.response && statusCodeError.response.headers,
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
