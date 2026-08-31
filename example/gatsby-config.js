require("dotenv").config()

const polyline = require("@mapbox/polyline")

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
              new Date().getMonth(),
              new Date().getDate()
            ).getTime() / 1000,
          extend: ({activity}) => {
            // Add geoJSON map
            if (activity.map && activity.map.summary_polyline) {
              activity.map.geoJSON = polyline.toGeoJSON(
                activity.map.summary_polyline
              )
            }
          },
        },
      },
    },
  ],
}
