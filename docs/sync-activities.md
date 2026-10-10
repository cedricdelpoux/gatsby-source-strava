# Syncing the activities with Strava

```shell
gatsby-source-strava-activities
```

The plugin only asks Strava for the activities started after its cursor (see
the [store](./store.md#incremental-fetch) documentation), so two kinds of
change never reach your site on their own:

- an activity deleted on strava.com stays in the store, a duplicate upload of
  a ride for instance;
- an activity uploaded again gets a new id but keeps its original start date,
  older than the cursor, so it never enters the store;
- an activity already in the store never gets what the plugin options start
  asking for afterwards, a stream added to `streamsTypes` for instance.

This command lists every activity your Strava account holds today, compares
them with the store and with the plugin options, and prints the three lists. It costs one request every 200
activities, so about 20 for a history of 4000.

```shell
$ gatsby-source-strava-activities
4039 activities on Strava
2 deleted on Strava, still in the store
  19963471569  2026-08-28  Morning Ride
  19891004606  2026-08-25  Lunch Swim
1 missing from the store
  20020096602  2026-08-25  Nage Statique
2 lacking what the plugin options ask for, 2 requests
  9374311551  2023-06-24  Bikepacking day 1  (streams latlng)
  9381126482  2023-06-25  Bikepacking day 2  (streams latlng)
Run again with --write to update the store
```

Nothing is changed unless `--write` is passed. It then deletes the activities
gone from Strava, completes the stored ones, and adds the missing ones, built exactly as the plugin builds
the activities it sources (see [the plugin options](#the-plugin-options)
below).

When the deleted activities are more than a tenth of the store, `--write`
stops before changing anything. A list that short usually means the token sees
less than the one the store was built with: the token of another athlete, or
one generated with private activities left unchecked on the Strava
authorization page. Pass `--force` once you have checked that those
activities really are gone.

Once `--write` has run, the store holds your whole account as it stood when
the command listed it, so the command moves the cursor to that moment and the
next build skips all of it. It leaves the cursor alone when it compared only a
part of the history, or ran with `--no-config`.

The command reads your `.env` files the same way your `gatsby-config.js` does.
While `gatsby develop` is running, the change shows up without a restart (see
[watching for changes](./store.md#watching-for-changes-in-gatsby-develop)).

## The plugin options

The command reads the plugin options from the `gatsby-config.js` of the
current directory (`.cjs` and `.mjs` work too), and uses them the way a build
would:

- a missing activity gets the details `withStreams`, `withPhotos` and the
  other `activities` options ask for, a `withStreams` function included;
- the comparison stays within the `after` and `before` options, so that the
  activities a site leaves out on purpose are not listed as missing;
- the store is the one `storeDir` names.

The command line options come on top: a detail option adds to the plugin
options, `--after`, `--before` and `--dir` override them. `--config <path>`
reads another file, and `--no-config` reads none, relying on the command line
options alone. That is the way to go with a `gatsby-config.ts`, which only
Gatsby knows how to load.

## Options

| Option              | Effect                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `--write`           | Delete the activities gone from Strava, complete and add the others           |
| `--force`           | Delete them even when they are more than a tenth of the store                 |
| `--after <date>`    | Only compare the activities started after a date, overriding `after`          |
| `--before <date>`   | Only compare the activities started before a date, overriding `before`        |
| `--streams [types]` | Add streams to the missing activities, all of them when left empty            |
| `--comments`        | Add comments to the missing activities                                        |
| `--kudos`           | Add kudos to the missing activities                                           |
| `--laps`            | Add laps to the missing activities                                            |
| `--photos[=size]`   | Add photos to the missing activities, 1800 pixels wide unless a size is given |
| `--zones`           | Add zones to the missing activities, needs a Strava subscription              |
| `--all`             | Every detail option above                                                     |
| `--dir <path>`      | Store directory, defaults to the plugin's `storeDir`, or `.strava`            |
| `--config <path>`   | Site config to read the plugin options from                                   |
| `--no-config`       | Rely on the command line options alone                                        |
| `--help`            | Show the usage                                                                |

The detail options mean the same as for
[`gatsby-source-strava-activity`](./fetch-activity.md#options) and cost one
request per missing activity. `--after` and `--before` take a timestamp, as
the plugin options do, or a date such as `2018-10-14`.

## Completing the stored activities

A stored activity is checked against the `activities` options, a
`withStreams` function included, and only what it lacks is fetched and merged
into it, the way
[`gatsby-source-strava-activity`](./fetch-activity.md#adding-to-an-activity-you-already-fetched)
adds to an activity. That costs one request per detail lacking, and nothing
more once the store is complete. The detail options of the command line are
left out of it: they are for the missing activities, and would otherwise cost
a request on every activity of your history.

A stream type Strava has no data for, a track on an indoor ride for instance,
is stored as `null`, so that it is not asked for again on every run.

Each activity is written as soon as it is complete, so that a run stopped by
the [rate limits](./rate-limits.md) picks up where it left off when run again.

This is how a site keeps some activities more precise than others, from a
store started from scratch as much as from an existing one. The
`summary_polyline` Strava lists an activity with is simplified, enough on a
long ride to miss a map tile here and there, while the `latlng` stream holds
every recorded point:

```js
const preciseActivities = new Set(require("./precise-activities.json"))

module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                activities: {
                    withStreams: (activity) =>
                        preciseActivities.has(String(activity.id)),
                    streamsTypes: ["latlng"],
                },
            },
        },
    ],
}
```

A build fetches the stream of the listed activities it sources, and
`gatsby-source-strava-activities --write` the stream of the ones already in
the store, an id added to the list later included.

## What it does not catch

An activity edited on strava.com keeps its id, so it is in both lists and
the command leaves it alone. Use
[`gatsby-source-strava-activity --refresh`](./fetch-activity.md#picking-up-an-edit-made-on-stravacom)
to pick up the edit.
