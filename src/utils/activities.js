const {get} = require("./get.js")

const getActivities = ({
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
}) =>
  new Promise(async (resolve, reject) => {
    let activitiesPageCount
    let page = 1
    const activities = []

    do {
      const activitiesPage = await getActivitiesPage({
        after,
        before,
        token,
        page,
      })

      const requests = await activitiesPage.map(
        async activity =>
          new Promise(async resolve => {
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
          })
      )

      await Promise.all(requests).then(activitiesPageFull => {
        activitiesPageFull.forEach(activityFull => {
          activities.push(activityFull)
        })

        activitiesPageCount = activitiesPageFull.length
        page++
      })
    } while (activitiesPageCount > 0)

    resolve(activities)
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

const getActivitiesPage = ({token: access_token, before, after, page}) =>
  get({
    args: {
      access_token,
      after,
      before,
      page,
      per_page: 20,
    },
    method: {category: "athlete", name: "listActivities"},
  })

const getActivityLaps = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listLaps"},
  })

const getActivityComments = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listComments"},
  })

const getActivityKudos = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listKudos"},
  })

const getActivityPhotos = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listPhotos"},
  })

const getActivityRelated = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listRelated"},
  })

const getActivityZones = ({token: access_token, activityId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "activities", name: "listZones"},
  })

module.exports = {
  getActivities,
  getActivityComments,
  getActivityKudos,
  getActivityLaps,
  getActivityPhotos,
  getActivityRelated,
  getActivityStreams,
  getActivityZones,
}
