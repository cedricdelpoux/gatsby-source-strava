require("dotenv").config()

module.exports = {
  plugins: [
    {
      //resolve: "gatsby-source-strava"
      resolve: require.resolve(`..`),
      options: {
        stravaClientId: process.env.STRAVA_CLIENT_ID,
        stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
        stravaToken: process.env.STRAVA_TOKEN,
        debug: true,
        activities: {
          after:
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 1,
              new Date().getDate()
            ).getTime() / 1000,
        },
      },
    },
  ],
}
