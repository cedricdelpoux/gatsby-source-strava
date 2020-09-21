# Token

The package needs 3 `.env` variables with the following format to work:

```dotenv
STRAVA_CLIENT_ID=2845
STRAVA_CLIENT_SECRET=c3d62caed3sjf4vdjsb096d010d81f52a17ac5
STRAVA_TOKEN={"access_token":"ya...J0","refresh_token":"1..mE","expires_at":1581439030,"expires_in":21600}
```

`gatsby-source-strava` expose a script to make the generation easier.

Open a terminal at the root of your project and type:

> You must be in the root folder of your project to run the script

```shell
gatsby-source-strava-token
```

Follow the instructions and the token will be added to your different `.env` files

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
