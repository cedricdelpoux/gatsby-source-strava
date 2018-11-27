const sleep = require("system-sleep")

const get = require("./get.js")
const {
  readActivitiesFromCache,
  readLastFetchFromCache,
  writeLastFetchToCache,
  writeActivityToCache,
} = require("./cache.js")

const getActivities = async ({token, options}) => {
  const {cacheDir, ...activitiesOptions} = options
  let activitiesPageCount
  let page = 1
  const nowTimestamp = new Date().getTime()

  const activities = cacheDir ? await readActivitiesFromCache(cacheDir) : []
  const lastTimestamp = cacheDir ? await readLastFetchFromCache(cacheDir) : null

  do {
    try {
      const activitiesPageFull = await getActivitiesPageFull({
        token,
        options: {
          ...activitiesOptions,
          after: options.after || lastTimestamp,
        },
        page,
      })

      activitiesPageFull.forEach(async activityFull => {
        activities.push(activityFull)

        if (cacheDir) {
          await writeActivityToCache(cacheDir, activityFull)
        }
      })

      activitiesPageCount = activitiesPageFull.length
      page++
    } catch (e) {
      activitiesPageCount = null

      if (e.code === "SHORT_LIMIT") {
        // eslint-disable-next-line
        console.info("\n", "source-strava: ", e.massage, new Date(), "\n")
        await sleep(900000) // Wait 15min
      } else {
        throw e
      }
    }
  } while (activitiesPageCount === null || activitiesPageCount > 0)

  if (cacheDir) {
    await writeLastFetchToCache(cacheDir, nowTimestamp)
  }

  return activities
}

const getActivitiesPageFull = async ({
  token,
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
  try {
    const activitiesPage = await getActivitiesPage({
      after,
      before,
      token,
      page,
    })

    if (activitiesPage && activitiesPage.length > 0) {
      const requests = await activitiesPage.map(
        async activity =>
          new Promise(async (resolve, reject) => {
            try {
              const comments = withComments
                ? await getActivityComments({
                    activityId: activity.id,
                    token,
                  })
                : null

              const kudos = withKudos
                ? await getActivityKudos({
                    activityId: activity.id,
                    token,
                  })
                : null

              const laps = withLaps
                ? await getActivityLaps({
                    activityId: activity.id,
                    token,
                  })
                : null

              const photos = withPhotos
                ? await getActivityPhotos({
                    activityId: activity.id,
                    token,
                  })
                : null

              const related = withRelated
                ? await getActivityRelated({
                    activityId: activity.id,
                    token,
                  })
                : null

              const streams = withStreams
                ? await getActivityStreams({
                    activityId: activity.id,
                    token,
                    streamsTypes,
                  })
                : null

              const zones = withZones
                ? await getActivityZones({
                    activityId: activity.id,
                    token,
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

              resolve(activityFull)
            } catch (e) {
              reject(e)
            }
          })
      )

      return await Promise.all(requests)
    } else return []
  } catch (e) {
    throw e
  }
}

const getActivitiesPage = async ({token: access_token, before, after, page}) =>
  get({
    args: {
      access_token,
      after,
      before,
      page,
      per_page: 30,
    },
    method: {category: "athlete", name: "listActivities"},
  })

const getActivityLaps = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listLaps"},
  })

const getActivityComments = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listComments"},
  })

const getActivityKudos = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listKudos"},
  })

const getActivityPhotos = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listPhotos"},
  })

const getActivityRelated = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listRelated"},
  })

const getActivityStreams = ({
  token: access_token,
  activityId: id,
  streamsTypes: types,
}) =>
  get({
    args: {
      id,
      access_token,
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

const getActivityZones = async ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listZones"},
  })

module.exports = getActivities
