const WINDOW_MINUTES = 15
const MARGIN_SECONDS = 5

// `system-sleep` was used here, but it is a native module blocking the whole
// event loop for the 15 min of the wait
const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration))

// Strava resets the short rate limit on natural 15 minutes intervals, at 0, 15,
// 30 and 45 minutes after the hour, not 15 minutes after the limit was reached.
// Waiting for the next of those saves up to 15 minutes of build time.
const getNextWindowDate = () => {
  const date = new Date()

  date.setMinutes(
    (Math.floor(date.getMinutes() / WINDOW_MINUTES) + 1) * WINDOW_MINUTES,
    MARGIN_SECONDS,
    0
  )

  return date
}

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
    const newTryDate = getNextWindowDate()
    const waitingTime = newTryDate.getTime() - Date.now()

    reporter.warn(
      `source-strava: Waiting ${Math.ceil(waitingTime / 60000)} min.`
    )
    reporter.info("source-strava: New try at " + newTryDate.toLocaleString())

    await sleep(waitingTime)

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
