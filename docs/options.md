# Options

## Mandatory options

```js
require("dotenv").config()

module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                stravaClientId: process.env.STRAVA_CLIENT_ID,
                stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
                stravaToken: process.env.STRAVA_TOKEN,
            },
        },
    ],
}
```

With the default configuration, `gatsby-source-strava` fetch [Athlete][strava-athlete] and [Athlete activities][strava-athlete-activities].

> ⚠️ _Be careful with your Strava Rate Limits_ ⚠️
>
> Read [Rate Limits](./rate-limits.md) documentation.

## Activities

To add data to activities objects, try the following options:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                activitiesOptions: {
                    //
                    // Extending options
                    // --------------------------------
                    //
                    // When using extending options, it's recommanded to reduce the activities count per page
                    perPage: 200, // 200 is max. You will get error with more.
                    // Add comments to every activity
                    withComments: true,
                    // Add kudos to every activity
                    withKudos: true,
                    // Add laps to every activity
                    withLaps: true,
                    // Add photos to every activity
                    withPhotos: true,
                    // Add related activities to every activity
                    withRelated: true,
                    // Add zones to every activity (need Strava Summit Analysis Pack)
                    withZones: true,
                    // Add streams to every activity (see streamTypes)
                    withStreams: true,
                    // --- OR
                    withStreams: (activity) => activity.id === ID,
                    //
                    // Add analyzed data to every activity
                    // withStreams option must be true or a function to works
                    // See https://developers.strava.com/docs/reference/#api-models-StreamSet
                    streamsTypes: [
                        "time",
                        "cadence",
                        "distance",
                        "latlng",
                        "heartrate",
                        "temp",
                        "moving",
                        "grade_smooth",
                        "watts",
                        "velocity_smooth",
                        "altitude",
                    ],
                    // Filtering options
                    // --------------------------------
                    //
                    // Timestamp for filtering activities that have taken place BEFORE a certain time
                    before: "1539500400",
                    // Timestamp for filtering activities that have taken place AFTER a certain time
                    after: "1539500400",
                    after:
                        new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() - 1,
                            new Date().getDate()
                        ).getTime() / 1000, // Last month activities only
                    //
                    // Add custom data
                    // ------
                    extend: ({activity}) => {
                        activity.isMountainBike =
                            activity.gear_id === "MY_BIKE_ID"
                    },
                },
            },
        },
    ],
}
```

> The filtering options `after` will take over the `last-fetch` timestamp used internally by `gatsby-source-strava` to fetch only new activities. Use with caution. Otherwise, you will reach your [Rate Limits](./rate-limits.md) regularly.

## Athlete

To add data to athlete object, try the following options in your `gatsby-config.js`:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                athlete: {
                    //
                    // Extending options
                    // --------------------------------
                    //
                    // Add athlete koms
                    withKoms: true,
                    // Add athlete routes
                    withRoutes: true,
                    // Add athlete stats
                    withStats: true,
                    // Add athlete zones
                    withZones: true,
                    //
                    // Add custom data
                    // ------
                    extend: ({activities, athlete}) => {
                        let heartrateMax
                        activities.forEach((activity) => {
                            if (activity.has_heartrate) {
                                if (
                                    !heartrateMax ||
                                    activity.max_heartrate > heartrateMax
                                ) {
                                    heartrateMax = activity.max_heartrate
                                }
                            }
                        })

                        athlete.heartrateMax = heartrateMax
                    },
                },
            },
        },
    ],
}
```

### Debug

For a better stack trace and more information, try the following option in your `gatsby-config.js`:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                debug: true,
            },
        },
    ],
}
```

[strava-athlete-activities]: http://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
[strava-athlete]: http://developers.strava.com/docs/reference/#api-Athletes-getLoggedInAthlete
