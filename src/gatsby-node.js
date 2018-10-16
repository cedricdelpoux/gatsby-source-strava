const crypto = require("crypto")
const Promise = require("bluebird")

const {getActivities} = require("./utils/activities.js")
const {getAthlete} = require("./utils/athlete.js")

exports.sourceNodes = (
  {actions: {createNode}},
  {token, activitiesOptions, athleteOptions}
) =>
  new Promise(async (resolve, reject) => {
    if (!token) {
      reject("Missing Strava API token")
    }

    try {
      let heartrateMax
      const activities = await getActivities({
        token,
        options: activitiesOptions,
      })

      if (activities && activities.length > 0) {
        activities.forEach(activity => {
          if (athleteOptions.computeHeartrateMax && activity.has_heartrate) {
            if (!heartrateMax || activity.max_heartrate > heartrateMax) {
              heartrateMax = activity.max_heartrate
            }
          }

          createNode({
            activity,
            id: `Strava Activity: ${activity.id}`,
            parent: "__SOURCE__",
            children: [],
            internal: {
              type: "StravaActivity",
              contentDigest: crypto
                .createHash("md5")
                .update(JSON.stringify(activity))
                .digest("hex"),
            },
          })
        })
      }

      const athlete = await getAthlete({
        token,
        options: athleteOptions,
      })

      createNode({
        athlete: {
          ...athlete,
          ...(athleteOptions.computeheartrateMax ? {heartrateMax} : {}),
        },
        id: `Strava Athlete: ${athlete.id}`,
        parent: "__SOURCE__",
        children: [],
        internal: {
          type: "StravaAthlete",
          contentDigest: crypto
            .createHash("md5")
            .update(JSON.stringify(athlete))
            .digest("hex"),
        },
      })

      resolve()
    } catch (e) {
      reject(e)
    }
  })
