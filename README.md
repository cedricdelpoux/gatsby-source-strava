# gatsby-source-strava

[![npm package][npm-badge]][npm]

Gatsby plugin to use Strava as a data source

## Getting started

[![gatsby-source-strava](https://nodei.co/npm/gatsby-source-strava.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gatsby-source-strava/)

You can download `gatsby-source-strava` from the NPM registry via the
`npm` or `yarn` commands

```shell
yarn add gatsby-source-strava
# OR
npm install gatsby-source-strava --save
```

### Generate a token to access Strava API:

`gatsby-source-strava` provides a command-line script to generate a Strava token.

```shell
gatsby-source-strava-token
```

> You must be in the root folder of your project to run the script because it will write the token to your file system.

You should add the cache folder `.strava/` to your `.gitignore` because it contains some sensitive informartions.  
For more information, see [cache](./docs/cache.md) documentation.

To use your token on CDN, see [token](./docs/token.md) documentation.

## Usage

Add the plugin in your `gatsby-config.js` file:

```js
module.exports = {
    plugins: ["gatsby-source-strava"],
}
```

That's it!

> For advanced configuration, please read [options](./docs/options.md) documentation.

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
