<div align="center">
  <h1>gatsby-source-strava</h1>
  <br/>
  <p>
    <img src="./logo.png" alt="gatsby-source-strava" height="100px">
  </p>
  <br/>

[![Npm version][badge-npm]][npm]
[![Npm downloads][badge-npm-dl]][npm]
[![MIT license][badge-licence]](./LICENCE.md)
[![PRs welcome][badge-prs-welcome]](#contributing)

</div>

---

Gatsby plugin to use Strava as a data source

> Requires Node 20 or later.

## Usage

1. Download `gatsby-source-strava` from the NPM registry:

```shell
yarn add gatsby-source-strava
```

2. [Generate a token](./docs/token.md)

The package needs 3 `.env` variables with the following format to work:

```dotenv
STRAVA_CLIENT_ID=2845
STRAVA_CLIENT_SECRET=c3d62caed3sjf4vdjsb096d010d81f52a17ac5
STRAVA_TOKEN={"access_token":"ya...J0","refresh_token":"1..mE","expires_at":1581439030,"expires_in":21600}
```

`gatsby-source-strava` expose a script to make the generation easier.

Open a terminal at the root of your project and type:

```shell
gatsby-source-strava-token
```

3. [Add the plugin](./docs/options.md) in your `gatsby-config.js` file

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

That's it!

> For advanced configuration, please read [options](./docs/options.md) documentation.

## Data

The plugin creates a `StravaAthlete` node and one `StravaActivity` node per
activity, with a `coordinates` field ready for a map. Their GraphQL types are
declared by the plugin, so your queries work even before the first activity is
fetched.

## Store

Your history is fetched once and kept in a `.strava` directory next to your
`gatsby-config.js`, not in the Gatsby cache. A build only fetches the activities
you recorded since the previous one, even after a `gatsby clean` or on a fresh
continuous integration checkout.

> Strava allows 100 requests every 15 minutes and 1000 a day. Read the
> [rate limits](./docs/rate-limits.md) documentation before enabling options
> that fetch more of every activity.

## Commands

| Command                              | What it does                                             |
| ------------------------------------ | -------------------------------------------------------- |
| `gatsby-source-strava-token`         | Generates the token the plugin needs                     |
| `gatsby-source-strava-activity <id>` | Fetches one activity again, with as much detail as asked |

## Documentation

-   [Options](./docs/options.md), everything you can configure
-   [Store](./docs/store.md), where your activities live and when they are fetched
-   [Rate limits](./docs/rate-limits.md), what Strava allows and how to handle it
-   [Token](./docs/token.md), generating and refreshing it
-   [Fetching an activity again](./docs/fetch-activity.md), to add details or pick up an edit
-   [Creating pages](./docs/create-pages.md), one page per activity

## Contributing

-   ⇄ Pull/Merge requests and ★ Stars are always welcome.
-   For bugs and feature requests, please [create an issue][github-issue].

## Changelog

See [CHANGELOG](./CHANGELOG.md)

## License

This project is licensed under the MIT License - see the
[LICENCE](./LICENCE.md) file for details

[badge-npm]: https://img.shields.io/npm/v/gatsby-source-strava.svg?style=flat-square
[badge-npm-dl]: https://img.shields.io/npm/dt/gatsby-source-strava.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-prs-welcome]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[npm]: https://www.npmjs.org/package/gatsby-source-strava
[github-issue]: https://github.com/cedricdelpoux/gatsby-source-strava/issues/new
