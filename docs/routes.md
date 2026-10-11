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
activities, ready for a GeoJSON `LineString`. It is decoded from
`map.summary_polyline`. A route follows the road network with a point at every
turn, so its summary track is barely shorter than the detailed one: 284 points
against 288 on a 10.5 km route. Fetching the detail would cost one request per
route for nothing visible on a map.

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

`fetchRoutes` returns them as Strava sends them, and `normalizeRoute` turns one
of those into a node.
