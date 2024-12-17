const sleep = require("system-sleep")

const {strava} = require("./strava.js")
const {to10DigitTimestamp} = require("./timestamp.js")

const getActivities = async ({cache, debug, options = {}, reporter}) => {
  let hasNextPage
  let page = 1
  let retry = false
  let after = options.after
  let activities = []
  let cachedActivitiesIds = (await cache.get("activities")) || []

  if (cachedActivitiesIds && cachedActivitiesIds.length > 0) {
    cachedActivitiesIds.forEach(async (activityId) => {
      const activity = await cache.get(`${activityId}`)
      activities[activityId] = activity
    })

    if (debug) {
      reporter.success(
        `source-strava: ${cachedActivitiesIds.length} activities restored from cache`
      )
    }
  }

  const lastFetch = await cache.get("last-fetch")

  if (!after && activities.length > 0 && lastFetch) {
    after = to10DigitTimestamp(lastFetch)
  }

  if (debug && after) {
    reporter.info(
      "source-strava: Fetching activities since " +
        new Date(after * 1000).toLocaleString()
    )
  }

  do {
    retry = false
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
        const activitiesTimestamp = activitiesPageFull.map((activity) =>
          new Date(activity.start_date).getTime()
        )
        const lastActivityTimestamp = Math.max(...activitiesTimestamp)

        activitiesPageFull.forEach(async (activityFull) => {
          activities[activityFull.id] = activityFull
          await cache.set(`${activityFull.id}`, activityFull)
        })

        await cache.set("activities", Object.keys(activities))
        await cache.set("last-fetch", lastActivityTimestamp)

        hasNextPage = activitiesPageFull.length > 0
        page++
      } else {
        await cache.set("last-fetch", Date.now())
      }
    } catch (e) {
      await cache.set("activities", activities)

      if (e.code === "SHORT_LIMIT") {
        retry = true

        reporter.warn("source-strava: " + e.message)

        const waintingTime = 900 // 15 minutes
        const newTryDate = new Date()
        newTryDate.setSeconds(newTryDate.getSeconds() + waintingTime)

        reporter.info(
          "source-strava: New try at " + newTryDate.toLocaleString()
        )

        await sleep(waintingTime * 1000)
      } else {
        throw e
      }
    }
  } while (hasNextPage || retry)

  // return [...cachedActivities, ...newActivities]
  return Object.values(activities)
}

const getActivitiesPageFull = async ({
  options: {
    streamsTypes = [],
    withComments = false,
    withKudos = false,
    withLaps = false,
    withPhotos = false,
    withRelated = false,
    withStreams = false,
    withZones = false,
    ...options
  },
  page,
}) => {
  const activitiesPage = await getActivitiesPage({
    ...options,
    page,
  })

  if (!activitiesPage || activitiesPage.length === 0) {
    return []
  }

  return Promise.all(
    activitiesPage.map(async (activity) => {
      const comments = withComments
        ? await getActivityComments({
            activityId: activity.id,
          })
        : null

      const kudos = withKudos
        ? await getActivityKudos({
            activityId: activity.id,
          })
        : null

      const laps = withLaps
        ? await getActivityLaps({
            activityId: activity.id,
          })
        : null

      const photos = withPhotos
        ? await getActivityPhotos({
            activityId: activity.id,
          })
        : null

      const related = withRelated
        ? await getActivityRelated({
            activityId: activity.id,
          })
        : null

      const fetchActivityStreams =
        (typeof withStreams === "function" && withStreams(activity)) ||
        withStreams === true

      const streams =
        fetchActivityStreams && streamsTypes.length > 0
          ? await getActivityStreams({
              activityId: activity.id,
              streamsTypes,
            })
          : null

      const zones = withZones
        ? await getActivityZones({
            activityId: activity.id,
          })
        : null

      const activityFull = {
        ...activity,
        ...(comments && {comments}),
        ...(kudos && {kudos}),
        ...(laps && {laps}),
        ...(photos && {photos}),
        ...(related && {related}),
        ...(streams && {streams}),
        ...(zones && {zones}),
      }

      return activityFull
    })
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

const getActivityLaps = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listLaps"},
  })

const getActivityComments = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listComments"},
  })

const getActivityKudos = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listKudos"},
  })

const getActivityPhotos = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listPhotos"},
  })

const getActivityRelated = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listRelated"},
  })

const getActivityStreams = ({activityId: id, streamsTypes: types}) =>
  strava.fetch({
    args: {
      id,
      types,
      series_type: "time",
      resolution: "high",
      key_by_type: true,
    },
    method: {category: "streams", name: "activity"},
    format: (payload) => {
      const streams = {}

      if (payload && payload.length > 0) {
        payload.forEach(({type, data}) => {
          streams[type] = data
        })
      }

      return streams
    },
  })

const getActivityZones = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listZones"},
  })

module.exports = getActivities
