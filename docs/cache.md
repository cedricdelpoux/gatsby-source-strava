# Cache

Fetching a whole Strava history takes minutes and hundreds of requests, so
`gatsby-source-strava` caches it in the Gatsby cache and only fetches what is
new on the next builds.

Three things are stored: every activity under its id, the list of those ids,
and a `last-fetch` timestamp, the cursor telling where the next build should
start from. The athlete is never cached, it is fetched on every build.

## Incremental fetch

The first build fetches the whole history, then writes the cursor. The next
builds restore the activities from the cache and only ask Strava for the ones
started after the cursor.

The cursor is only written once the whole history has been walked through. A
fetch interrupted by a [rate limit](./rate-limits.md) keeps the activities it
managed to fetch, leaves the cursor where it was, and the next build resumes
from there.

## What empties the cache

Gatsby deletes its whole cache when the options of a plugin change, and the
plugin then fetches everything again. Beware of option values computed when the
config is loaded: `after: new Date(...).getTime() / 1000` gives a new value
every day, which silently forces a complete refetch, daily. Editing the
`gatsby-node.js` of your site has the same effect.

You can also empty it on purpose:

```shell
gatsby clean
```

## Activities changed on Strava

The plugin never asks Strava again for an activity older than the cursor, so an
activity edited after it was cached keeps the version it had when it was
fetched, and an activity deleted on Strava stays in your site. Renaming a ride
on strava.com, for instance, does not change anything on the next build.

Run `gatsby clean` to fetch everything again when this matters to you.

## Fetching only a part of the history

The `after` and `before` options take over the cursor, so a site configured
with them never uses the incremental fetch. See the
[options](./options.md#activities) documentation.
