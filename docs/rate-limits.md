# Rate limits

⚠️ _Be carefull with your Strava Rate Limits_ ⚠️

Short Rate Limit: 600 requests every 15 minutes
Long Rate Limit: 30000 daily

Each option represent 1 request.

If you enable the 22 options, you will be able to fetch only 27 activities before reaching the short rate Limit.

## Short Rate Limit

`gatsby-source-strava` will wait 15 minutes if you reach the short rate limit.

Build time can be very long if you fetch all your history with thousand of activities.
It will only be long the first fetch because this plugin cache data.

See [Cache](./cache.md) documentation.

## Long Rate Limit

`gatsby-source-strava` will throw an error if you reach the long rate limit.
