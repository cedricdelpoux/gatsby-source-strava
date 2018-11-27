class SourceStravaError extends Error {
  constructor(code, category, name, ...args) {
    super(...args)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SourceStravaError)
    }

    this.code = code
    this.category = category
    this.name = name
    this.date = new Date()
  }
}

module.exports = SourceStravaError
