# Fetching an activity again

```shell
gatsby-source-strava-activity <activityId>
```

Fetches one activity from Strava and replaces its file in the
[store](./store.md). The plugin never asks Strava again for an activity older
than its cursor, so this command is how you pick up an activity you edited on
strava.com, and how you add details to an activity without paying for them on
your whole history.

It fetches the [detailed activity][strava-activity], which holds more than the
listed one the plugin sources: `description`, `calories`, `gear`,
`segment_efforts`, `splits_metric`, and the complete `polyline` of the track
rather than its simplified version.

The command reads your `.env` files the same way your `gatsby-config.js` does,
and never moves the cursor: the next build still fetches only what is new.

Running it again never drops what an earlier run added: an option not passed
this time falls back to what is already in the store, and streams are merged
type by type, so asking for `heartrate` after a `latlng` run keeps both.

## Options

| Option              | Effect                                                              |
| ------------------- | ------------------------------------------------------------------- |
| `--streams [types]` | Add streams, comma separated, all of them when left empty           |
| `--comments`        | Add comments                                                        |
| `--kudos`           | Add kudos                                                           |
| `--laps`            | Add laps                                                            |
| `--photos`          | Add photos                                                          |
| `--zones`           | Add zones, needs a Strava subscription                              |
| `--refresh`         | Re-fetch the activity itself, to pick up an edit made on strava.com |
| `--all`             | Every option above, `--refresh` included                            |
| `--dir <path>`      | Store directory, defaults to `.strava`                              |
| `--help`            | Show the usage                                                      |

Each option costs one request against your [rate limits](./rate-limits.md), on
that single activity. `--refresh` is skipped by default, and implied the first
time an activity is fetched — there being nothing yet to add options onto.

## Picking up an edit made on strava.com

The plugin never asks Strava again for an activity older than its cursor, so
this is how you refresh one after editing it: its name, description, gear, or
anything else that isn't a stream, comments, kudos, laps, photos or zones.

```shell
gatsby-source-strava-activity 4291234567 --refresh
```

Skipping `--refresh` on an activity already in the store, with no other option
either, is a no-op and the command fails rather than doing nothing silently:

```shell
$ gatsby-source-strava-activity 4291234567
Nothing to fetch: pass --refresh, or an option like --streams, --photos...
```

## Adding to an activity you already fetched

Adding a stream, some photos, or anything else, does not need `--refresh`: the
activity itself does not change just because you are asking Strava for more of
it, so this only costs the one request for what you asked:

```shell
gatsby-source-strava-activity 4291234567 --streams heartrate
```

Combine it with `--refresh` to do both in the same run.

## Streams

The `latlng` stream holds the recorded points at their full precision, and is
what `coordinates` is built from when you fetch it:

```shell
gatsby-source-strava-activity 4291234567 --streams latlng
```

An activity without GPS data, an indoor workout for instance, simply comes back
without that stream, no error and no `coordinates`.

Strava caps a stream at 10000 points. Beyond that, on a very long ride, the
`polyline` of the detailed activity is denser than the stream, at the cost of
being rounded to about a meter:

| Source                 | 2 h ride | 18 h ride |
| ---------------------- | -------- | --------- |
| `map.summary_polyline` | 288      | 223       |
| `map.polyline`         | 3906     | 11038     |
| `latlng` stream        | 10000    | 10000     |

`coordinates` is built from the stream when it is there, then from `polyline`,
then from `summary_polyline`. `--refresh` alone is enough to get the complete
track, without spending a request on a stream.

Pick several of them, or take everything:

```shell
gatsby-source-strava-activity 4291234567 --streams latlng,heartrate,altitude
gatsby-source-strava-activity 4291234567 --streams
```

The available types are `time`, `distance`, `latlng`, `altitude`,
`velocity_smooth`, `heartrate`, `cadence`, `watts`, `temp`, `moving` and
`grade_smooth`. See the [Strava documentation][strava-streams].

## A shortcut in your package.json

Presetting the options you always use leaves only the activity id to type:

```json
{
    "scripts": {
        "fetch-activity": "gatsby-source-strava-activity --streams latlng"
    }
}
```

```shell
yarn fetch-activity 4291234567
# npm needs a double dash before the id
npm run fetch-activity -- 4291234567
```

## Querying what you fetched

The added fields are not part of the types the plugin declares, Gatsby infers
them from the activities that carry them. They are queryable as soon as one
activity in the store holds them:

```graphql
{
    stravaActivity(id: {eq: "4291234567"}) {
        name
        calories
        coordinates
        gear {
            name
        }
        segment_efforts {
            name
            elapsed_time
        }
    }
}
```

[strava-activity]: https://developers.strava.com/docs/reference/#api-Activities-getActivityById
[strava-streams]: https://developers.strava.com/docs/reference/#api-models-StreamSet
