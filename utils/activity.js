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

const getActivityStreams = ({activityId: id, streamsTypes: keys}) =>
  strava.fetch({
    args: {
      id,
      keys,
      series_type: "time",
      resolution: "high",
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
//
// `existing`, only passed by the command, is the activity as it stood in the
// store before this call. An option not requested this run falls back to
// whatever `existing` already held, so running the command again with a
// different set of options never drops what an earlier run added — streams
// are merged type by type instead, so adding `heartrate` to an activity that
// already has `latlng` keeps both.
const buildActivity = async ({
  activity,
  existing = null,
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

  const comments = withComments
    ? await getActivityComments({activityId})
    : existing && existing.comments
  const kudos = withKudos
    ? await getActivityKudos({activityId})
    : existing && existing.kudos
  const laps = withLaps
    ? await getActivityLaps({activityId})
    : existing && existing.laps
  const photos = withPhotos
    ? await getActivityPhotos({activityId})
    : existing && existing.photos
  const zones = withZones
    ? await getActivityZones({activityId})
    : existing && existing.zones

  const fetchActivityStreams =
    (typeof withStreams === "function" && withStreams(activity)) ||
    withStreams === true

  const freshStreams =
    fetchActivityStreams && streamsTypes.length > 0
      ? await getActivityStreams({activityId, streamsTypes})
      : null

  const streams =
    freshStreams || (existing && existing.streams)
      ? {...(existing && existing.streams), ...freshStreams}
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
