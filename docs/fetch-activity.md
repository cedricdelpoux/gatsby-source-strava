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

## Options

| Option              | Effect                                                    |
| ------------------- | --------------------------------------------------------- |
| `--streams [types]` | Add streams, comma separated, all of them when left empty |
| `--comments`        | Add comments                                              |
| `--kudos`           | Add kudos                                                 |
| `--laps`            | Add laps                                                  |
| `--photos`          | Add photos                                                |
| `--zones`           | Add zones, needs a Strava subscription                    |
| `--all`             | Every option above, every stream included                 |
| `--dir <path>`      | Store directory, defaults to `.strava`                    |
| `--help`            | Show the usage                                            |

Each option costs one request against your
[rate limits](./rate-limits.md), on that single activity.

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
then from `summary_polyline`. Fetching the activity without `--streams` is
enough to get its complete track.

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
