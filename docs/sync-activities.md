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
  older than the cursor, so it never enters the store.

This command lists every activity your Strava account holds today, compares
them with the store, and prints both lists. It costs one request every 200
activities, so about 20 for a history of 4000.

```shell
$ gatsby-source-strava-activities
4039 activities on Strava
2 deleted on Strava, still in the store
  19963471569  2026-08-28  Morning Ride
  19891004606  2026-08-25  Lunch Swim
1 missing from the store
  20020096602  2026-08-25  Nage Statique
Run again with --write to update the store
```

Nothing is changed unless `--write` is passed. It then deletes the activities
gone from Strava and adds the missing ones, built exactly as the plugin builds
the activities it sources.

When the deleted activities are more than a tenth of the store, `--write`
stops before changing anything. A list that short usually means the token sees
less than the one the store was built with: the token of another athlete, or
one generated with private activities left unchecked on the Strava
authorization page. Pass `--force` once you have checked that those
activities really are gone.

The command reads your `.env` files the same way your `gatsby-config.js` does,
and never moves the cursor. While `gatsby develop` is running, the change
shows up without a restart (see
[watching for changes](./store.md#watching-for-changes-in-gatsby-develop)).

## Options

| Option              | Effect                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `--write`           | Delete the activities gone from Strava and add the missing ones               |
| `--force`           | Delete them even when they are more than a tenth of the store                 |
| `--after <date>`    | Only compare the activities started after a date or a timestamp               |
| `--before <date>`   | Only compare the activities started before a date or a timestamp              |
| `--streams [types]` | Add streams to the missing activities, all of them when left empty            |
| `--comments`        | Add comments to the missing activities                                        |
| `--kudos`           | Add kudos to the missing activities                                           |
| `--laps`            | Add laps to the missing activities                                            |
| `--photos[=size]`   | Add photos to the missing activities, 1800 pixels wide unless a size is given |
| `--zones`           | Add zones to the missing activities, needs a Strava subscription              |
| `--all`             | Every detail option above                                                     |
| `--dir <path>`      | Store directory, defaults to `.strava`                                        |
| `--help`            | Show the usage                                                                |

The detail options mean the same as for
[`gatsby-source-strava-activity`](./fetch-activity.md#options) and cost one
request per missing activity. Pass the ones your `gatsby-config.js` sets, so
that an added activity has the same details as the others:

```json
{
    "scripts": {
        "sync-activities": "gatsby-source-strava-activities --streams latlng"
    }
}
```

## Sites fetching only a part of the history

A site setting the `after` or `before` [options](./options.md#activities) only
holds that part of the history in its store, and every activity outside of it
would be listed as missing. Pass the same bounds to the command, which also
spares the requests for the pages outside of them:

```shell
gatsby-source-strava-activities --after 1539500400
```

They take a timestamp, as the plugin options do, or a date such as
`2018-10-14`.

## What it does not catch

An activity edited on strava.com keeps its id, so it is in both lists and
the command leaves it alone. Use
[`gatsby-source-strava-activity --refresh`](./fetch-activity.md#picking-up-an-edit-made-on-stravacom)
to pick up the edit.
