const sleep = require("system-sleep")

const {get} = require("./strava.js")
const {cache} = require("./cache.js")

const getActivities = async ({debug, options = {}}) => {
  let hasNextPage
  let page = 1
  let retry = false
  let after = options.after
  const newActivities = []
  const cachedActivities = await cache.getActivities()
  const lastTimestamp = await cache.getLastFetch()

  if (!after && lastTimestamp) {
    after = lastTimestamp
  }

  if (debug && after) {
    console.info(
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
          newActivities.push(activityFull)

          await cache.setActivity(activityFull)
          await cache.setLastFetch(lastActivityTimestamp)
        })

        hasNextPage = activitiesPageFull.length > 0
        page++
      } else {
        await cache.setLastFetch(Date.now())
      }
    } catch (e) {
      if (e.code === "SHORT_LIMIT") {
        retry = true

        console.warn("source-strava: " + e.message)

        const waintingTime = 900 // 15 minutes
        const newTryDate = new Date()
        newTryDate.setSeconds(newTryDate.getSeconds() + waintingTime)

        console.info("source-strava: New try at " + newTryDate.toLocaleString())

        await sleep(waintingTime * 1000)
      } else {
        throw e
      }
    }
  } while (hasNextPage || retry)

  if (debug) {
    console.info(
      `source-strava: ${
        newActivities.length
      } new activities ${new Date().toLocaleString()}`
    )
  }

  return [...cachedActivities, ...newActivities]
}

const getActivitiesPageFull = async ({
  options: {
    after = null,
    before = null,
    streamsTypes = [],
    withComments = false,
    withKudos = false,
    withLaps = false,
    withPhotos = false,
    withRelated = false,
    withStreams = false,
    withZones = false,
  },
  page,
}) => {
  const activitiesPage = await getActivitiesPage({
    after,
    before,
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

const getActivitiesPage = async ({before, after, page}) =>
  get({
    args: {
      ...(after ? {after} : {}),
      ...(before ? {before} : {}),
      page,
      per_page: 30,
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
