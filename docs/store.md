# Store

Fetching a whole Strava history takes minutes and hundreds of requests, so
`gatsby-source-strava` keeps it on disk and only fetches what is new on the
next builds.

```
.strava/
├── activities/
│   ├── 4291234567.json
│   └── 4291234568.json
└── state.json
```

One file per activity, named after its id, plus a `state.json` holding the
timestamp of the last complete fetch. The athlete is never stored, it is
fetched on every build.

The directory sits next to your `gatsby-config.js` and is yours: nothing but
you empties it. Add it to your `.gitignore`, or commit it to give your
continuous integration a full history without spending a single request.

Use the `storeDir` option to put it somewhere else:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                storeDir: ".strava",
            },
        },
    ],
}
```

> Until 3.0.0 activities were kept in the Gatsby cache. They are moved to the
> store on the first build, so upgrading does not refetch anything.

## Why not the Gatsby cache

Gatsby empties its cache whenever the version of any installed plugin changes,
`package.json` is touched, `gatsby-config.js` or `gatsby-node.js` is edited
down to a single comment, or `gatsby clean` is run. A continuous integration
job usually starts without a `.cache` directory at all.

Adding a dependency to your site would then cost a complete refetch of your
history, against a quota of 1000 requests a day. The Gatsby cache is meant for
data you can afford to lose, which this is not.

## Incremental fetch

The first build fetches the whole history, then writes the cursor to
`state.json`. The next builds read the activities from the store and only ask
Strava for the ones started after the cursor.

The cursor is only written once the whole history has been walked through. A
fetch interrupted by a [rate limit](./rate-limits.md) keeps the activities it
managed to fetch, leaves the cursor where it was, and the next build resumes
from there.

## Activities changed on Strava

The plugin never asks Strava again for an activity older than the cursor, so an
activity edited after it was stored keeps the version it had when it was
fetched, and an activity deleted on Strava stays in your site. Renaming a ride
on strava.com, for instance, does not change anything on the next build.

Deleting a single file does not bring it back either: it is older than the
cursor, so it is never asked for again. Use the
[`gatsby-source-strava-activity`](./fetch-activity.md) command, which fetches one
activity and replaces its file, or delete the whole directory to start over.

## Watching for changes in `gatsby develop`

While `gatsby develop` is running, the plugin watches `activities/` for
changes made outside of it — typically `gatsby-source-strava-activity`
refetching one activity in another terminal. On any change, it replays every
activity from the store: cheap, since it only reads local files, no Strava
request. Nothing to configure, and it never runs during `gatsby build`.

## Fetching only a part of the history

The `after` and `before` options take over the cursor, so a site configured
with them never uses the incremental fetch. See the
[options](./options.md#activities) documentation.
