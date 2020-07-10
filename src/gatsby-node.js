const getActivities = require("./utils/activities.js")
const getAthlete = require("./utils/athlete.js")
const {strava} = require("./utils/strava.js")

const dotenv = require("dotenv")

dotenv.config()

exports.sourceNodes = async (
  {actions, createNodeId, createContentDigest, reporter, cache},
  pluginOptions = {}
) => {
  try {
    await strava.init()

    const activities = await getActivities({
      debug: pluginOptions.debug,
      options: pluginOptions.activities,
      cache,
      reporter,
    })

    if (activities && activities.length > 0) {
      activities.forEach(activity => {
        if (pluginOptions.activities && pluginOptions.activities.extend) {
          pluginOptions.activities.extend({activity})
        }

        actions.createNode({
          activity,
          id: createNodeId(`StravaActivity${activity.id}`),
          internal: {
            type: "StravaActivity",
            contentDigest: createContentDigest(activity),
          },
        })
      })

      reporter.success(`source-strava: ${activities.length} activities fetched`)
    }

    const athlete = await getAthlete({
      options: pluginOptions.athlete,
    })

    if (pluginOptions.athlete && pluginOptions.athlete.extend) {
      pluginOptions.athlete.extend({activities, athlete})
    }

    actions.createNode({
      athlete,
      id: createNodeId(`StravaAthlete${athlete.id}`),
      internal: {
        type: "StravaAthlete",
        contentDigest: createContentDigest(athlete),
      },
    })

    reporter.success(`source-strava: athlete fetched`)
  } catch (e) {
    if (pluginOptions.debug) {
      reporter.panic(`source-strava: `, e)
    } else {
      reporter.panic(`source-strava: ${e.message}`)
    }
  }
}
