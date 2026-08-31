# 3.0.0

## Breaking changes

-   Removed: `withRelated` option, Strava closed the endpoint it relied on
-   Changed: `coordinates` is now absent instead of empty on an activity without
    a track, filter with `coordinates: {ne: null}`
-   Changed: the plugin declares its own GraphQL types, a site declaring
    conflicting ones must drop them

## Features

-   feat: declare Strava types in plugin schema, sites no longer need their own
    `createSchemaCustomization` and queries survive an empty fetch
-   feat: add `waitOnRateLimit` and `stopOnRateLimit` plugin options
-   perf: wait until the next quarter hour on a rate limit rather than 15 min

## Fixes

-   fix: `withKoms` and `withPhotos` crashed the build, the underlying
    `strava-v3` methods do not exist
-   fix: apply rate limit handling to the athlete fetch, a rate limit made the
    build fail whatever the options
-   fix: read the `x-readratelimit-*` headers, a read only plugin reaches those
    limits first
-   fix: only move the fetch cursor once the whole history was fetched, a
    truncated first fetch lost the older activities for good
-   fix: await the activities restored from cache
-   fix: build `coordinates` from the latlng streams when they are fetched
-   fix: reject network errors instead of leaving the build hanging forever
-   fix: listen on a free port when generating a token, 5000 is taken by the
    AirPlay receiver on macOS
-   fix: drop the undeclared `request-promise` dependency
-   fix: replace `system-sleep`, which blocked the event loop while waiting

## Documentation

-   docs: rename `activitiesOptions` to `activities`, the option was renamed in
    2.0.0 and the documented one was silently ignored
-   docs: update the Strava rate limits, 100 requests per 15 min and 1000 daily
-   docs: fix the outdated `create-pages` example

# 2.4.0

-   feat: add `coordinates` field to activity

# 2.3.0

-   feat: update `withStreams` option to be a boolean or a function

# 2.2.0

-   fix: use activity id string as cache key

# 2.1.0

-   Added: **Gatsby v4** compatibility

# 2.0.0

-   Added: Strava OAuth 2 support
-   Added: `generate-token` script
-   Updated: Simpler configuration
-   Updated: Better documentation
-   Updated: Better logs

# 1.4.0

-   Updated: Errors handling

# 1.3.4

-   Removed: Gatsby dependency

# 1.3.3

-   Updated: Error handling

# 1.3.2

-   Updated: Better debug logs

# 1.3.0

-   Updated: Handle 10 and 13 digit timestamps
-   Added: Debug option

# 1.2.2

-   Fixed: Cast timestamp to Int

# 1.2.1

-   Fixed: cache behavior

# 1.2.0

-   Added: `cacheDir` to activitiesOptions

# 1.1.0

-   Added: `withZones` option to add zones to every activity (need Strava Summit Analysis Pack)

# 1.0.1

-   Fixed: Move `before` and `after` to `activitiesOptions`
-   Updated: Handle `Strava` API limits

# 1.0.0

-   Added: Initial commit
