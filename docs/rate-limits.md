# Rate limits

⚠️ _Be carefull with your Strava Rate Limits_ ⚠️

Short Rate Limit: 100 requests every 15 minutes
Long Rate Limit: 1000 daily

Strava applies two limits: an overall one, 200 requests every 15 minutes and
2000 daily, and a stricter read only one, half of it. This plugin only reads,
so the read limits above are the ones you reach first. Limits are set per
application: check the `x-readratelimit-limit` response header or your
[application settings][strava-settings] to know yours.

The 15 minutes window resets on the quarter hour, the daily one at midnight
UTC.

Fetching activities costs 1 request per page of 200 activities. Then each
`with` option costs 1 request per activity, so enabling the 6 of them
(`withComments`, `withKudos`, `withLaps`, `withPhotos`, `withStreams`,
`withZones`) lets you fetch around 16 activities before reaching the short rate
limit.

## Short Rate Limit

By default, `gatsby-source-strava` warns and stops fetching when the short rate
limit is reached: the activities already fetched are kept, the missing ones are
fetched on the next build.

To wait for the window to open again and resume instead, use the
`waitOnRateLimit` option:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                waitOnRateLimit: true,
            },
        },
    ],
}
```

The wait targets the next quarter hour rather than a fixed 15 minutes, so it
lasts 15 minutes at worst and around 7 on average.

Build time can be very long if you fetch all your history with thousand of
activities. It will only be long the first fetch because this plugin caches
data.

## Long Rate Limit

The daily limit only resets at midnight UTC, so waiting is pointless:
`gatsby-source-strava` always stops fetching when it is reached.

## Failing the build

With the `stopOnRateLimit` option, reaching any of the two limits throws
instead of building a site with partial data:

```js
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-strava",
            options: {
                stopOnRateLimit: true,
            },
        },
    ],
}
```

Both options apply to every Strava call, activities and athlete alike.

## Combining both options

The two options are complementary rather than exclusive: `waitOnRateLimit`
decides whether to wait, `stopOnRateLimit` what to do when waiting is not an
option. Setting both is the safest combination, waiting for what is worth
waiting for and failing rather than publishing an incomplete site:

| `waitOnRateLimit` | `stopOnRateLimit` | Short rate limit | Long rate limit |
| ----------------- | ----------------- | ---------------- | --------------- |
| false _(default)_ | false _(default)_ | keeps partial    | keeps partial   |
| true              | false             | waits 15 min     | keeps partial   |
| false             | true              | build fails      | build fails     |
| true              | true              | waits 15 min     | build fails     |

[strava-settings]: https://www.strava.com/settings/api
