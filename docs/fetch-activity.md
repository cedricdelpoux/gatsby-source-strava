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
| `--photos[=size]`   | Add photos, 1800 pixels wide unless a size is given                 |
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

`coordinates` is built from the stream when it is there, then from
`map.polyline`, the complete track rounded to about a meter, then from
`map.summary_polyline`, its simplified version. `--refresh` alone is enough to
get `polyline`, without spending a request on a stream.

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
activity in the store holds them. Their ids are strings, like every id the
plugin creates — a segment effort id, at 19 digits, is past what a number
holds exactly:

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

A photo comes back at 1800 pixels, capped at its own resolution, under the
`_1800` key — Strava keys a photo url by the size asked of it, and GraphQL
cannot name a field starting with a digit. An activity fetched before the
plugin asked for a size holds a placeholder image instead, until it is
fetched again.

Ask for another size with `--photos=600`, and the key follows it, `_600`.
Strava answers a single size a call, so fetching an activity at 600 and
another at 1800 leaves the two under different keys — worth keeping to one
size across a store. The size has to be written with an `=`: a bare number
after `--photos` is read as the activity id.

`photos` is always the list `--photos` fetches. Strava also puts a
`{primary, count}` summary of its own on an activity, under that same name;
it is `photos_summary` here, so that the two shapes stop colliding — a
collision that used to cost every field of both. Only that summary names the
photo Strava leads with, nothing in the list itself does.

That primary comes at three sizes, `urls { _100 _600 _1800 }`, all three on
the one call `--refresh` already makes — a cover photo, thumbnail to full
size, without spending a request on the list. An activity fetched before the
plugin asked for 1800 reads it null until `--refresh` picks it up.

Each lap, effort, comment and photo comes back from Strava with the activity
and the athlete it belongs to embedded on it. Those are dropped, being the
very activity and athlete they hang off — `laps { activity { name } }` was
only ever a way round to `name`. The athlete on a comment is kept: that one
is whoever wrote it.

[strava-activity]: https://developers.strava.com/docs/reference/#api-Activities-getActivityById
[strava-streams]: https://developers.strava.com/docs/reference/#api-models-StreamSet
