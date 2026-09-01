const polyline = require("@mapbox/polyline")

const {strava} = require("./strava.js")

const getActivityDetails = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "get"},
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

// `strava-v3` has no method for this endpoint
const getActivityPhotos = async ({activityId: id}) =>
  strava.fetch({
    args: {},
    method: {path: `activities/${id}/photos`},
  })

const getActivityZones = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listZones"},
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

// The latlng stream holds the recorded points at full precision, but Strava
// caps it at 10000, so `polyline`, the complete track of a detailed activity
// encoded to about a meter, can be denser on a very long one. The stream still
// comes first: it was asked for explicitly, and the difference only shows up
// past 10000 points. `summary_polyline` is the simplified track of a listed
// activity, the only one the plugin gets on its own.
const getCoordinates = ({activity, streams}) => {
  const latlngStream = streams && streams.latlng
  const activityMap = activity.map || {}
  const encoded = activityMap.polyline || activityMap.summary_polyline
  const points = latlngStream || (encoded ? polyline.decode(encoded) : [])

  return points.map(([lat, lng]) => [lng, lat]) // x,y
}

// Adds to an activity everything the options ask for. Shared by the source
// plugin and the `gatsby-source-strava-activity` command, so that a refetched
// activity has the very same shape as a sourced one.
const buildActivity = async ({
  activity,
  options: {
    streamsTypes = [],
    withComments = false,
    withKudos = false,
    withLaps = false,
    withPhotos = false,
    withStreams = false,
    withZones = false,
  } = {},
}) => {
  const activityId = activity.id

  const comments = withComments ? await getActivityComments({activityId}) : null
  const kudos = withKudos ? await getActivityKudos({activityId}) : null
  const laps = withLaps ? await getActivityLaps({activityId}) : null
  const photos = withPhotos ? await getActivityPhotos({activityId}) : null
  const zones = withZones ? await getActivityZones({activityId}) : null

  const fetchActivityStreams =
    (typeof withStreams === "function" && withStreams(activity)) ||
    withStreams === true

  const streams =
    fetchActivityStreams && streamsTypes.length > 0
      ? await getActivityStreams({activityId, streamsTypes})
      : null

  const coordinates = getCoordinates({activity, streams})

  return {
    ...activity,
    // Manual and indoor activities have no track at all
    ...(coordinates.length > 0 && {coordinates}),
    ...(comments && {comments}),
    ...(kudos && {kudos}),
    ...(laps && {laps}),
    ...(photos && {photos}),
    ...(streams && {streams}),
    ...(zones && {zones}),
  }
}

module.exports = {buildActivity, getActivityDetails}
