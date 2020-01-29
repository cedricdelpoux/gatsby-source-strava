class SourceStravaError extends Error {
  constructor(code, category, method, ...args) {
    super(...args)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SourceStravaError)
    }

    this.name = "StravaError"
    this.code = code
    this.category = category
    this.method = method
    this.date = new Date()
  }
}

module.exports = SourceStravaError
