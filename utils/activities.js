const {buildActivity} = require("./activity.js")
const {handleRateLimit, isRateLimitError} = require("./rate-limit.js")
const {strava} = require("./strava.js")
const {to10DigitTimestamp} = require("./timestamp.js")

// Activities were stored in the Gatsby cache until 3.1.0. They are moved to
// the store on the first build, so that an existing history is not fetched
// again, and the Gatsby cache is never written to afterwards.
const restoreFromGatsbyCache = async ({cache, store}) => {
  const cachedActivitiesIds = (await cache.get("activities")) || []
  const activities = []

  for (const activityId of cachedActivitiesIds) {
    const activity = await cache.get(`${activityId}`)

    if (activity) {
      await store.writeActivity(activity)

      activities.push(activity)
    }
  }

  const lastFetch = await cache.get("last-fetch")

  if (activities.length > 0 && lastFetch) {
    await store.writeState({lastFetch})
  }

  return activities
}

const getActivities = async ({
  cache,
  debug,
  options = {},
  rateLimit,
  reporter,
  store,
}) => {
  let page = 1
  let hasNextPage
  let mustRetry = false
  let isTruncated = false
  let after = options.after
  const activities = {}
  const fetchDate = Date.now()

  let stored = await store.readActivities()

  if (stored.length === 0) {
    stored = await restoreFromGatsbyCache({cache, store})

    if (stored.length > 0) {
      reporter.info(
        `source-strava: ${stored.length} activities moved to ${store.dir}`
      )
    }
  }

  stored.forEach((activity) => {
    activities[activity.id] = activity
  })

  const restoredCount = stored.length

  if (restoredCount > 0 && debug) {
    reporter.success(
      `source-strava: ${restoredCount} activities restored from ${store.dir}`
    )
  }

  const {lastFetch} = await store.readState()

  if (!after && restoredCount > 0 && lastFetch) {
    after = to10DigitTimestamp(lastFetch)
  }

  if (debug && after) {
    reporter.info(
      "source-strava: Fetching activities since " +
        new Date(after * 1000).toLocaleString()
    )
  }

  do {
    mustRetry = false
    hasNextPage = false

    try {
      const activitiesPageFull = await getActivitiesPageFull({
        options: {
          ...options,
          after,
        },
        page,
      })

      if (activitiesPageFull.length > 0) {
        for (const activityFull of activitiesPageFull) {
          activities[activityFull.id] = activityFull

          await store.writeActivity(activityFull)
        }

        hasNextPage = true
        page++
      }
    } catch (e) {
      if (!isRateLimitError(e)) throw e

      mustRetry = await handleRateLimit({
        error: e,
        options: rateLimit,
        reporter,
      })

      if (!mustRetry) {
        isTruncated = true

        reporter.warn(
          "source-strava: Fetch stopped, some activities are missing"
        )
      }
    }
  } while (hasNextPage || mustRetry)

  // `lastFetch` means "everything older is stored", so it is only written once
  // the whole history has been walked through: without an `after` option Strava
  // returns the newest activities first, and moving the cursor after a
  // truncated fetch would leave the older ones behind for good
  if (!isTruncated) {
    await store.writeState({lastFetch: fetchDate})
  }

  return Object.values(activities)
}

const getActivitiesPageFull = async ({options, page}) => {
  const activitiesPage = await getActivitiesPage({...options, page})

  if (!activitiesPage || activitiesPage.length === 0) {
    return []
  }

  return Promise.all(
    activitiesPage.map((activity) => buildActivity({activity, options}))
  )
}

const getActivitiesPage = async ({
  before = null,
  after = null,
  perPage = 200,
  page,
}) =>
  strava.fetch({
    args: {
      ...(after ? {after} : {}),
      ...(before ? {before} : {}),
      page,
      per_page: perPage,
    },
    method: {category: "athlete", name: "listActivities"},
  })

module.exports = getActivities
