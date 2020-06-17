# Token

Token must be provided with an environment variable: `process.env.GATSBY_SOURCE_STRAVA_TOKEN`.

`gatsby-source-strava` provides a command-line script to generate a Strava token.

> You must be in the root folder of your project to run the script

```shell
gatsby-source-strava-token
```

Follow the instructions and the token will be added to your different `.env` files with the format: `GATSBY_SOURCE_STRAVA_TOKEN={...}`

> If you have multiple `.env` files for your different environments, the script will write the token at the end of each file

You should add your `.env` files to your `.gitignore` because it contains some sensitive informations.

# Troubleshooting

## `'gatsby-source-strava-token' is not recognized as an internal or external command,`

Add an `npm` script to your `package.json`:

```
"scripts": {
    "token": "gatsby-source-strava-token"
}
```

Then generate a token:

```
yarn token
# or
npm run token
```
