const WAITING_TIME = 900 // 15 minutes, the length of the short limit window

// `system-sleep` was used here, but it is a native module blocking the whole
// event loop for the 15 min of the wait
const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration))

const isRateLimitError = (error) =>
  error.code === "SHORT_LIMIT" || error.code === "LONG_LIMIT"

// Applies the `waitOnRateLimit` and `stopOnRateLimit` options to a rate limit
// error. The two are complementary: the first answers whether to wait, the
// second what to do when waiting is not an option. Throws when the build must
// fail, returns whether to try again.
const handleRateLimit = async ({error, options = {}, reporter}) => {
  reporter.warn("source-strava: " + error.message)

  // Waiting only makes sense for the short limit, the long one resets daily
  if (error.code === "SHORT_LIMIT" && options.waitOnRateLimit === true) {
    const newTryDate = new Date()
    newTryDate.setSeconds(newTryDate.getSeconds() + WAITING_TIME)

    reporter.warn("source-strava: Waiting 15 min.")
    reporter.info("source-strava: New try at " + newTryDate.toLocaleString())

    await sleep(WAITING_TIME * 1000)

    return true
  }

  if (options.stopOnRateLimit) {
    reporter.info("source-strava: Stop on rate limit")
    throw error
  }

  return false
}

// Runs `fetch`, waiting and trying again when the rate limit allows it.
// Returns null when the data could not be fetched.
const fetchWithRateLimit = async ({fetch, options, reporter}) => {
  for (;;) {
    try {
      return await fetch()
    } catch (e) {
      if (!isRateLimitError(e)) throw e

      const retry = await handleRateLimit({error: e, options, reporter})

      if (!retry) return null
    }
  }
}

module.exports = {fetchWithRateLimit, handleRateLimit, isRateLimitError}
