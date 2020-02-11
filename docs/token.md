# Token

Token can be provided to `gatsby-source-strava` with two different way.

## Token file

`gatsby-source-strava` provides a command-line script to generate a Strava token.

```shell
gatsby-source-strava-token
```

> You must be in the root folder of your project to run the script because it will write the token to your file system.
> Path should be /.strava

## Environment variable

if `process.env.GATSBY_SOURCE_STRAVA_TOKEN` exists, it will take over the token file stored in the [cache folder](./cache.md).

It is usefull on CDN like `Netlify`

Copy content of `/.strava/token.json` and paste it in a environment variable
