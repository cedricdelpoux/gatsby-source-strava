# 3.3.0

## Features

- feat: watch the store in `gatsby develop`, refetching an activity in
  another terminal now shows up without restarting the dev server

## Fixes

- fix: stop capping the `latlng` stream at 10000 points, a very long
  activity could lose a short deviation the capped stream resampled away

# 3.2.1

## Fixes

- fix: raise the request timeout from 10s to 30s
- fix: retry a request twice on a network timeout
- fix: name which call failed on a network error
- fix: log only the newly fetched activities, not the whole store
- fix: log the store path relative to the site, not the full absolute one

# 3.2.0

## Breaking changes

- Changed: requires Node 20 or later

## Features

- feat: `--refresh` re-fetches the activity on `gatsby-source-strava-activity`;
  adding a stream or a detail no longer needs it
- feat: refetching an activity never drops what an earlier run added

## Fixes

- fix: turn json-bigint decimals back into numbers
- fix: read Strava's error message from `error.data`
- fix: streams came back empty, filtering silently did nothing
- fix: remove the stale `.lintstagedrc`, ESLint never ran pre-commit

## Dependencies

- chore: update `strava-v3` to 4.0.1, drops `request` for axios
- chore: update `express` to 5 and `glob` to 13
- chore: update `prettier` to 3
- chore: update `eslint` to 9, migrated to its flat config
- chore: update `husky` to 9 and `lint-staged` to 16
- chore: update inquirer and open

# 3.1.0

## Features

- feat: keep activities in a `.strava` store instead of the Gatsby cache
- feat: add `gatsby-source-strava-activity`, to refetch one activity
- feat: a refetched activity gets its complete track, not the simplified one

## Fixes

- fix: replace env variables instead of appending duplicates

## Documentation

- docs: document the store and the `gatsby-source-strava-activity` command

# 3.0.0

## Breaking changes

- Removed: `withRelated` option, Strava closed the endpoint
- Changed: `coordinates` is absent instead of empty without a track
- Changed: the plugin declares its own GraphQL types

## Features

- feat: declare Strava types in plugin schema
- feat: add `waitOnRateLimit` and `stopOnRateLimit` options
- perf: wait until the next quarter hour on a rate limit

## Fixes

- fix: `withKoms` and `withPhotos` crashed the build
- fix: apply rate limit handling to the athlete fetch
- fix: read the `x-readratelimit-*` headers
- fix: only move the fetch cursor once the whole history was fetched
- fix: await the activities restored from cache
- fix: build `coordinates` from the latlng streams
- fix: reject network errors instead of hanging forever
- fix: listen on a free port when generating a token
- fix: drop the undeclared `request-promise` dependency
- fix: replace `system-sleep`, which blocked the event loop

## Documentation

- docs: rename `activitiesOptions` to `activities`
- docs: update the Strava rate limits
- docs: fix the outdated `create-pages` example

# 2.4.0

- feat: add `coordinates` field to activity

# 2.3.0

- feat: update `withStreams` option to be a boolean or a function

# 2.2.0

- fix: use activity id string as cache key

# 2.1.0

- Added: **Gatsby v4** compatibility

# 2.0.0

- Added: Strava OAuth 2 support
- Added: `generate-token` script
- Updated: Simpler configuration
- Updated: Better documentation
- Updated: Better logs

# 1.4.0

- Updated: Errors handling

# 1.3.4

- Removed: Gatsby dependency

# 1.3.3

- Updated: Error handling

# 1.3.2

- Updated: Better debug logs

# 1.3.0

- Updated: Handle 10 and 13 digit timestamps
- Added: Debug option

# 1.2.2

- Fixed: Cast timestamp to Int

# 1.2.1

- Fixed: cache behavior

# 1.2.0

- Added: `cacheDir` to activitiesOptions

# 1.1.0

- Added: `withZones` option to add zones to every activity (need Strava Summit Analysis Pack)

# 1.0.1

- Fixed: Move `before` and `after` to `activitiesOptions`
- Updated: Handle `Strava` API limits

# 1.0.0

- Added: Initial commit
