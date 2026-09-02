const polyline = require("@mapbox/polyline")

const {strava} = require("./strava.js")

// Strava sizes the primary photo of an activity at 100 and 600 pixels when
// left to itself. It takes `photo_sizes[]` instead, repeated once per size,
// and answers all of them together — unlike the photos endpoint, which
// serves a single size a call. Asking for 1800 as well costs nothing, this
// being the same request, and gives a full size cover photo without spending
// one on the photo list.
//
// These sizes are fixed rather than an option: they name the fields of
// `StravaActivityPhotosSummaryPrimaryUrls`, which has to be declared because
// an activity without a photo carries a null primary that inference cannot
// see into.
const PRIMARY_PHOTO_SIZES = [100, 600, 1800]

// `strava-v3` forwards `include_all_efforts` alone on this call and drops
// everything else, so the sizes go through the url
const getActivityDetails = async ({activityId: id}) =>
  strava.fetch({
    args: {},
    method: {
      path: `activities/${id}?${PRIMARY_PHOTO_SIZES.map(
        (size) => `photo_sizes[]=${size}`
      ).join("&")}`,
    },
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

// Strava answers 30 kudoers a page unasked, which a well liked activity
// passes without saying so — the ones beyond simply never arrive. 200 is the
// most it allows on a page, and costs the same single request.
const KUDOS_PER_PAGE = 200

const getActivityKudos = async ({activityId: id}) =>
  strava.fetch({
    args: {id, per_page: KUDOS_PER_PAGE},
    method: {category: "activities", name: "listKudoers"},
  })

// Asked for no size, Strava answers with a placeholder image rather than the
// photo, so one is always requested. It answers a single size per call, keyed
// by the size asked rather than the one returned, and caps it at the photo's
// own resolution: 1800 is Strava's own default, and comes back as the
// original on anything smaller.
//
// The size cannot go through `args`: `strava-v3` builds a call by path from
// the url alone, dropping everything else, which is why it is in the query
// string here.
const DEFAULT_PHOTO_SIZE = 1800

const getActivityPhotos = async ({activityId: id, size}) =>
  strava.fetch({
    args: {},
    method: {
      path: `activities/${id}/photos?size=${
        typeof size === "number" ? size : DEFAULT_PHOTO_SIZE
      }`,
    },
  })

const getActivityZones = async ({activityId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "activities", name: "listZones"},
  })

// No `resolution` is passed: Strava then returns every recorded point
// instead of capping the stream at 10000 and resampling past that, which on
// a long activity can smooth away a short deviation - a brief out-and-back,
// say - narrow enough to fall between two resampled points. `series_type`
// only matters to that resampling, so it is dropped along with it.
const getActivityStreams = ({activityId: id, streamsTypes: keys}) =>
  strava.fetch({
    args: {
      id,
      keys,
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

// The latlng stream, fetched at full resolution, holds every recorded point
// and beats `polyline`, the track Strava simplifies for map display, which in
// turn beats `summary_polyline`, the simplified track of a listed activity,
// the only one the plugin gets on its own.
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
  // `withPhotos` doubles as the size to ask for, the way `withStreams`
  // doubles as a function: `true` takes the default
  const photos = withPhotos
    ? await getActivityPhotos({activityId, size: withPhotos})
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

  // Strava puts a `{primary, count}` summary of its own on the activity,
  // under the same `photos` name the fetched list takes. Writing the list
  // over it used to lose `primary`, the only thing naming the photo Strava
  // leads with — nothing in the list itself says which one that is.
  const photosSummary =
    activity.photos && !Array.isArray(activity.photos) ? activity.photos : null

  return {
    ...activity,
    // Manual and indoor activities have no track at all
    ...(coordinates.length > 0 && {coordinates}),
    ...(comments && {comments}),
    ...(kudos && {kudos}),
    ...(laps && {laps}),
    ...(photosSummary && {photos_summary: photosSummary}),
    ...(photos && {photos}),
    ...(streams && {streams}),
    ...(zones && {zones}),
  }
}

module.exports = {buildActivity, getActivityDetails}
