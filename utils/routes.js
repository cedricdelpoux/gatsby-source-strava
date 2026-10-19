const crypto = require("crypto")

const {getCoordinates} = require("./activity.js")
const {normalizeIds} = require("./normalize.js")
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
const normalizeRoute = (route) => {
  const normalized = normalizeIds(route)
  const coordinates = getCoordinates({map: route.map})

  return {
    ...normalized,
    id: route.id_str || String(route.id),
    ...(coordinates.length > 0 && {coordinates}),
  }
}

// Outside Gatsby, `strava.init` must run first
const getRoutes = async () => (await fetchRoutes()).map(normalizeRoute)

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

module.exports = {fetchRoutes, getRoutes, getRoutesVersion, normalizeRoute}
