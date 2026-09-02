const stravaApi = require("strava-v3")

// `strava-v3` hardcodes a 10s axios timeout, with no way to change it through
// its public API. A single page of 200 activities alone measured over 7s on a
// large history, leaving too little margin, and this is the only lever: its
// internal axios instance, not part of the package's public API, so this is
// wrapped in case a future version moves or renames it.
const AXIOS_TIMEOUT_MS = 30000

try {
  require("strava-v3/axiosUtility").axiosInstance.defaults.timeout =
    AXIOS_TIMEOUT_MS
} catch {
  // Falls back to strava-v3's own 10s default
}

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

// `strava-v3` only preserves the message of a network-level failure, not
// axios' own error code, so a genuine timeout or connection drop is told
// apart from a request that never left (bad url, bad config, ...) by this
// prefix alone. Only the former is worth retrying, the latter fails the same
// way every time.
const isTransientNetworkError = (error) =>
  error.name === "RequestError" &&
  error.message.startsWith("No response received")

// A short, capped backoff: Strava or the network blipping is common enough
// to be worth a couple of quick retries, not so unreliable that it needs more
const NETWORK_RETRY_DELAYS = [1000, 3000]

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration))

// `strava-v3` parses responses with `json-bigint`, which turns any number of
// about sixteen digits or more into a BigNumber object, later serialized as a
// string. A coordinate or an average then reaches Gatsby as a string on some
// activities and as a number on others, and Gatsby drops the fields whose type
// changes from one node to the next.
//
// Those decimals are measurements, converting them back costs a rounding way
// below what a GPS records. Integers of that size are ids, and turning them
// into a double would change their last digits, so they stay strings.
const toNumbers = (value) => {
  if (Array.isArray(value)) return value.map(toNumbers)

  if (value && typeof value === "object") {
    if (value._isBigNumber === true) {
      return value.isInteger() ? value.toString() : Number(value.toString())
    }

    const plain = {}

    Object.keys(value).forEach((key) => {
      plain[key] = toNumbers(value[key])
    })

    return plain
  }

  return value
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
    const {access_token} = this.token
    const params = {...args, access_token}
    const category = method.category || "endpoint"
    const name = method.name || method.path

    for (let attempt = 0; ; attempt++) {
      try {
        // `strava-v3` has no method for a few endpoints, which are called by
        // path through the http client every other method already uses
        const response = method.path
          ? await stravaApi.activities.client.getEndpoint(method.path, params)
          : await stravaApi[method.category][method.name](params)

        const payload = toNumbers(response)

        return format ? format(payload) : payload
      } catch (error) {
        if (
          isTransientNetworkError(error) &&
          attempt < NETWORK_RETRY_DELAYS.length
        ) {
          await sleep(NETWORK_RETRY_DELAYS[attempt])

          continue
        }

        // Not an HTTP error, and not one worth retrying: a bad request, or a
        // network failure that outlasted the retries above. Throwing is what
        // stops the build, letting it through would hang it forever. `error`
        // alone never says which of the many calls a build makes failed —
        // `getAthlete` for instance is up to five of them depending on
        // options — so it is wrapped with that context here too.
        if (error.name !== "StatusCodeError") {
          throw new StravaError(
            "network",
            category,
            name,
            `[${category}.${name}] ${error.message}`
          )
        }

        // Too Many Requests
        if (error.statusCode === 429) {
          throw this.handleTooManyRequests({
            category,
            method: name,
            headers: error.response && error.response.headers,
          })
        }

        throw this.handleError({
          category,
          method: name,
          error: (error.data && error.data.message) || error.message,
        })
      }
    }
  }
}

const strava = new Strava()

module.exports = {
  strava,
}
