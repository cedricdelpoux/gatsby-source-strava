const crypto = require("crypto")

const {getCoordinates} = require("./activity.js")
const {normalizeIds} = require("./normalize.js")
const {fetchWithRateLimit, isRateLimitError} = require("./rate-limit.js")
const {strava} = require("./strava.js")

// Strava answers 30 routes a page by default, and 200 at most
const ROUTES_PER_PAGE = 200

const getRoutesPage = ({page}) =>
  strava.fetch({
    args: {page, per_page: ROUTES_PER_PAGE},
    method: {category: "athlete", name: "listRoutes"},
  })

const fetchRoutes = async () => {
  const routes = []

  for (let page = 1; ; page++) {
    const routesPage = (await getRoutesPage({page})) || []

    routes.push(...routesPage)

    if (routesPage.length < ROUTES_PER_PAGE) return routes
  }
}

// A route id has 19 digits, `id` loses precision where `id_str` does not
const getRouteId = (route) => route.id_str || String(route.id)

// The stream has a point at every turn and at least one every 100 m, where
// `summary_polyline` keeps one every 300 m or so and cuts the turns by up to
// 25 m
const getRouteLatlng = ({routeId: id}) =>
  strava.fetch({
    args: {id},
    method: {category: "streams", name: "route"},
    format: (payload) => {
      const latlngStream = (payload || []).find(({type}) => type === "latlng")

      return latlngStream ? latlngStream.data : []
    },
  })

const shouldFetchStream = ({route, withRouteStreams}) =>
  (typeof withRouteStreams === "function" && withRouteStreams(route)) ||
  withRouteStreams === true

const fetchRouteLatlng = async ({rateLimit, reporter, routeId}) => {
  try {
    const latlng = await fetchWithRateLimit({
      fetch: () => getRouteLatlng({routeId}),
      options: rateLimit,
      reporter,
    })

    return {latlng, isRateLimited: latlng === null}
  } catch (e) {
    if (isRateLimitError(e)) throw e

    reporter.warn(
      `source-strava: Stream of route ${routeId} not fetched, using its summary: ${e.message}`
    )

    return {latlng: null, isRateLimited: false}
  }
}

// A stored stream is reused as long as the route keeps its `updated_at`, so a
// build only asks for the new and edited routes. A stream that cannot be
// fetched leaves its route with `summary_polyline` rather than failing the
// build, unless `stopOnRateLimit` asks for it.
const addRouteStreams = async ({
  rateLimit,
  reporter = console,
  routes,
  store,
  withRouteStreams,
}) => {
  const routesWithStreams = []
  let fetchedCount = 0
  let skippedCount = 0
  let isRateLimited = false

  for (const route of routes) {
    if (!shouldFetchStream({route, withRouteStreams})) {
      routesWithStreams.push(route)
      continue
    }

    const routeId = getRouteId(route)
    const stored = store ? await store.readRouteStream(routeId) : null
    let latlng =
      stored && stored.updated_at === route.updated_at ? stored.latlng : null

    if (!latlng && !isRateLimited) {
      const fetched = await fetchRouteLatlng({rateLimit, reporter, routeId})

      latlng = fetched.latlng
      isRateLimited = fetched.isRateLimited

      if (latlng) {
        fetchedCount++

        if (store) {
          await store.writeRouteStream(routeId, {
            updated_at: route.updated_at,
            latlng,
          })
        }
      }
    }

    if (!latlng && isRateLimited) skippedCount++

    routesWithStreams.push(
      latlng && latlng.length > 0 ? {...route, streams: {latlng}} : route
    )
  }

  if (skippedCount > 0) {
    reporter.warn(
      `source-strava: ${skippedCount} route streams not fetched, using their summary`
    )
  }

  return {routes: routesWithStreams, fetchedCount}
}

// `streams` only feeds `coordinates`, a route node does not carry it
const normalizeRoute = ({streams, ...route}) => {
  const normalized = normalizeIds(route)
  const coordinates = getCoordinates({map: route.map, streams})

  return {
    ...normalized,
    id: getRouteId(route),
    ...(coordinates.length > 0 && {coordinates}),
  }
}

// Outside Gatsby, `strava.init` must run first. `store` is optional, without
// it every stream is fetched again.
const getRoutes = async ({
  rateLimit,
  reporter,
  store,
  withRouteStreams,
} = {}) => {
  const listedRoutes = await fetchRoutes()

  if (!withRouteStreams) return listedRoutes.map(normalizeRoute)

  const {routes} = await addRouteStreams({
    rateLimit,
    reporter,
    routes: listedRoutes,
    store,
    withRouteStreams,
  })

  return routes.map(normalizeRoute)
}

// The same for the `StravaRoute` nodes and for `getRoutes`, whatever their
// order, and changed by any route added, edited or deleted
const getRoutesVersion = (routes) =>
  crypto
    .createHash("sha1")
    .update(
      routes
        .map(({id, updated_at}) => `${id}:${updated_at}`)
        .sort()
        .join("\n")
    )
    .digest("hex")
    .slice(0, 10)

module.exports = {
  addRouteStreams,
  fetchRoutes,
  getRoutes,
  getRoutesVersion,
  normalizeRoute,
}
