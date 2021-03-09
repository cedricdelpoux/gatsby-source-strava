const getActivities = require("./utils/activities.js")
const getAthlete = require("./utils/athlete.js")
const {strava} = require("./utils/strava.js")

exports.sourceNodes = async (
  {actions, createContentDigest, reporter, cache},
  pluginOptions = {}
) => {
  if (!pluginOptions.stravaClientId) {
    reporter.warn("source-strava: Missing `stravaClientId` option")
    return
  }

  if (!pluginOptions.stravaClientSecret) {
    reporter.warn("source-strava: Missing `stravaClientSecret` option")
    return
  }

  if (!pluginOptions.stravaToken) {
    reporter.warn("source-strava: Missing `stravaToken` option")
    return
  }

  try {
    await strava.init({
      clientId: pluginOptions.stravaClientId,
      clientSecret: pluginOptions.stravaClientSecret,
      token: pluginOptions.stravaToken,
    })

    const activities = await getActivities({
      debug: pluginOptions.debug,
      options: pluginOptions.activities,
      cache,
      reporter,
    })

    if (activities && activities.length > 0) {
      activities.forEach((activity) => {
        if (pluginOptions.activities && pluginOptions.activities.extend) {
          pluginOptions.activities.extend({activity})
        }

        actions.createNode({
          ...activity,
          id: activity.id.toString(),
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
      ...athlete,
      id: athlete.id.toString(),
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
