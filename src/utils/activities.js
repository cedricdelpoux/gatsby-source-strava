const sleep = require("system-sleep")

const {get} = require("./strava.js")
// const {cache} = require("./cache.js")

const getActivities = async ({cache, debug, options = {}, reporter}) => {
  let hasNextPage
  let page = 1
  let retry = false
  let after = options.after
  let newActivitiesCount = 0
  let activities = await cache.get("strava.activities")
  const lastFetch = await cache.get("strava.last-fetch")

  if (!after && lastFetch) {
    after = lastFetch
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
        const activitiesTimestamp = activitiesPageFull.map(activity =>
          new Date(activity.start_date).getTime()
        )
        const lastActivityTimestamp = Math.max(...activitiesTimestamp)

        activitiesPageFull.forEach(async activityFull => {
          newActivitiesCount += 1
          activities[activityFull.id] = activityFull
        })

        await cache.set("strava.activities", activities)
        await cache.set("strava.last-fetch", lastActivityTimestamp)

        hasNextPage = activitiesPageFull.length > 0
        page++
      } else {
        await cache.set("strava.last-fetch", Date.now())
      }
    } catch (e) {
      await cache.set("strava.activities", activities)

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

  if (debug) {
    reporter.info(
      `source-strava: ${newActivitiesCount} new activities ${new Date().toLocaleString()}`
    )
  }

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
    activitiesPage.map(async activity => {
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

      const streams = withStreams
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
  get({
    args: {
      ...(after ? {after} : {}),
      ...(before ? {before} : {}),
      page,
      per_page: perPage,
    },
    method: {category: "athlete", name: "listActivities"},
  })

const getActivityLaps = async ({activityId: id}) =>
  get({
    args: {id},
    method: {category: "activities", name: "listLaps"},
  })

const getActivityComments = async ({activityId: id}) =>
  get({
    args: {id},
    method: {category: "activities", name: "listComments"},
  })

const getActivityKudos = async ({activityId: id}) =>
  get({
    args: {id},
    method: {category: "activities", name: "listKudos"},
  })

const getActivityPhotos = async ({activityId: id}) =>
  get({
    args: {id},
    method: {category: "activities", name: "listPhotos"},
  })

const getActivityRelated = async ({activityId: id}) =>
  get({
    args: {id},
    method: {category: "activities", name: "listRelated"},
  })

const getActivityStreams = ({activityId: id, streamsTypes: types}) =>
  get({
    args: {
      id,
      types,
      series_type: "time",
      resolution: "high",
      key_by_type: true,
    },
    method: {category: "streams", name: "activity"},
    format: payload => {
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
  get({
    args: {id},
    method: {category: "activities", name: "listZones"},
  })

module.exports = getActivities
