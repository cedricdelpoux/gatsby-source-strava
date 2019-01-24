# gatsby-source-strava

[![npm package][npm-badge]][npm]

Gatsby plugin to use Strava as a data source

## Getting started

[![gatsby-source-strava](https://nodei.co/npm/gatsby-source-strava.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gatsby-source-strava/)

You can download `gatsby-source-strava` from the NPM registry via the
`npm` or `yarn` commands

```shell
yarn add gatsby-source-strava
npm install gatsby-source-strava --save
```

## Usage

Add the plugin in your `gatsby-config.js` file:

```js
const STRAVA_TOKEN = "your-token"
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                //
                // Mandatory
                // --------
                //
                token: STRAVA_TOKEN,

                //
                // Optional
                // --------
                //
                debug: true,
                activitiesOptions: {
                    // Options for filtering activities
                    // --------------------------------
                    //
                    // Timestamp for filtering activities that have taken place BEFORE a certain time
                    before: "1539500400",
                    // Timestamp for filtering activities that have taken place AFTER a certain time
                    after: "1539500400",
                    //
                    // Options for enhance activities
                    // --------------------------------
                    //
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
                    // Add streams to every activity (see streamTypes)
                    withStreams: true,
                    // Add zones to every activity (need Strava Summit Analysis Pack)
                    withZones: true,
                    //
                    // Add analyzed data to every activity
                    // withStreams option must be true
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
                    //
                    // Option to cache activities
                    // ------
                    cacheDir: `${__dirname}/.strava`,
                },
                athleteOptions: {
                    // Options computed by gatsby-source-strava
                    // ----------------------------------------
                    //
                    // Add `heartrateMax` data to `athlete`
                    computeHeartrateMax: true,
                    //
                    // Options for enhance athlete data
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
                },
            },
        },
    ],
}
```

## Contributing

-   ⇄ Pull/Merge requests and ★ Stars are always welcome.
-   For bugs and feature requests, please [create an issue][github-issue].

See [CONTRIBUTING](./CONTRIBUTING.md) guidelines

## Changelog

See [CHANGELOG](./CHANGELOG.md)

## License

This project is licensed under the MIT License - see the
[LICENCE](./LICENCE.md) file for details

[npm-badge]: https://img.shields.io/npm/v/gatsby-source-strava.svg?style=flat-square
[npm]: https://www.npmjs.org/package/gatsby-source-strava
[github-issue]: https://github.com/xuopled/gatsby-source-strava/issues/new
