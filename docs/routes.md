# Routes

With the `withRoutes` athlete option, the plugin creates one `StravaRoute` node
per route of your Strava account, on every build:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                athlete: {
                    withRoutes: true,
                },
            },
        },
    ],
}
```

It costs one request every 200 routes. Your private routes are only included
if your token holds the `read_all` scope, which the
[`gatsby-source-strava-token`](./token.md#what-the-token-can-read) command asks
for. Without it, Strava leaves them out without any error.

## Querying the routes

```graphql
query {
    allStravaRoute(sort: {updated_at: DESC}) {
        nodes {
            id
            name
            distance
            elevation_gain
            private
            starred
            coordinates
        }
    }
}
```

`coordinates` holds the track in the same `[lng, lat]` format as the
activities, ready for a GeoJSON `LineString`. By default, it is decoded from
`map.summary_polyline`, the simplified track Strava sends with the list of
routes. Add the [`withRouteStreams`](#full-track) option to get the full track.

`id` is a `String`, like every id the plugin creates. A route id has 19 digits,
more than a JavaScript number holds exactly.

Strava sends `type` and `sub_type` as numbers:

| Field      | Values                                                          |
| ---------- | --------------------------------------------------------------- |
| `type`     | 1 ride, 2 run                                                   |
| `sub_type` | 1 road, 2 mountain bike, 3 cyclocross, 4 trail, 5 mixed surface |

The `StravaRoute` type is declared even when `withRoutes` is disabled, so your
queries and the plugins adding fields to it with `createResolvers`, such as
`gatsby-strava-tiles`, keep working on a site without routes.

The athlete links to the same nodes, so `stravaAthlete { routes { name } }`
works too.

## Full track

`map.summary_polyline` keeps a point every 300 m or so, and cuts the turns: on
a 41 km route, it has 129 points, and 20% of the real track is more than 10 m
away from it, up to 25 m. That is fine for a map, not for comparing a route
with other data, such as the OpenStreetMap paths it goes through.

The `withRouteStreams` athlete option fetches the `latlng` stream of each
route, and `coordinates` is built from it. The same 41 km route then has 882
points, one every 47 m on average, at every turn and at least one every 100 m
on a straight line:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                athlete: {
                    withRoutes: true,
                    withRouteStreams: true,
                    // Or only for some routes
                    withRouteStreams: (route) => route.type === 1,
                },
            },
        },
    ],
}
```

A function receives each route as Strava lists it, before it becomes a node.

It costs one request per route, only for the new and edited ones: each stream
is kept in the [store](./store.md), and fetched again only when the
`updated_at` of its route changes. When a stream cannot be fetched, because of
a network error or a [rate limit](./rate-limits.md), the build goes on with
`map.summary_polyline` for that route and logs a warning. The stream is
fetched on the next build. `stopOnRateLimit` still stops the build.

The stream itself is not added to the node, only `coordinates`.

## When Strava cannot be reached

The routes are written to `routes.json` in the [store](./store.md). When a
build cannot fetch them, because of a network error or a
[rate limit](./rate-limits.md), it uses the routes of the last build that
could, and logs a warning.

## Rebuilding when a route changes

The plugin exports the function it uses to list the routes, so that code
running outside Gatsby can compare the routes on Strava with the ones of your
deployed site, for instance a scheduled Netlify function that triggers a build
hook when they differ:

```js
const {strava} = require("gatsby-source-strava/utils/strava.js")
const {getRoutes} = require("gatsby-source-strava/utils/routes.js")

await strava.init({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    token: process.env.STRAVA_TOKEN,
})

const routes = await getRoutes()
```

`getRoutes` returns the routes exactly as the `StravaRoute` nodes hold them.
Comparing the `id` and `updated_at` of each route is enough to tell whether one
was added, edited or deleted.

`coordinates` comes from `map.summary_polyline`, unless you pass the same
`withRouteStreams` option. Pass a store as well, so that only the streams of
the new and edited routes are fetched:

```js
const {createStore} = require("gatsby-source-strava/utils/store.js")

const routes = await getRoutes({
    store: createStore({dir: ".strava"}),
    withRouteStreams: true,
})
```

It also takes `rateLimit`, the `waitOnRateLimit` and `stopOnRateLimit`
options, and `reporter`, which defaults to `console`.

`fetchRoutes` returns them as Strava sends them, `addRouteStreams` adds their
stream, and `normalizeRoute` turns one of those into a node.

`getRoutesVersion` compares the `id` and `updated_at` for you. It turns a list
of routes into a short hash, the same for the `StravaRoute` nodes and for
`getRoutes` as long as no route was added, edited or deleted. Write it to a
file at build time:

```js
// gatsby-node.js
const fs = require("fs")
const {getRoutesVersion} = require("gatsby-source-strava/utils/routes.js")

exports.onPostBuild = ({getNodesByType}) => {
    fs.writeFileSync(
        "public/routes-version.json",
        JSON.stringify(getRoutesVersion(getNodesByType("StravaRoute")))
    )
}
```

Then compare it with the routes on Strava, and trigger a build when they
differ:

```js
const {
    getRoutes,
    getRoutesVersion,
} = require("gatsby-source-strava/utils/routes.js")

const deployedVersion = await fetch(
    `${process.env.URL}/routes-version.json`
).then((response) => response.json())

if (getRoutesVersion(await getRoutes()) !== deployedVersion) {
    await fetch(process.env.BUILD_HOOK_URL, {method: "POST"})
}
```
