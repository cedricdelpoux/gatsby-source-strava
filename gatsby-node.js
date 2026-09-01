const path = require("path")

const getActivities = require("./utils/activities.js")
const getAthlete = require("./utils/athlete.js")
const {fetchWithRateLimit} = require("./utils/rate-limit.js")
const {createStore} = require("./utils/store.js")
const {strava} = require("./utils/strava.js")
const {types} = require("./utils/types.js")

exports.createSchemaCustomization = ({actions}) => {
  actions.createTypes(types)
}

exports.sourceNodes = async (
  {actions, createContentDigest, reporter, cache, store},
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

    const rateLimit = {
      stopOnRateLimit: pluginOptions.stopOnRateLimit,
      waitOnRateLimit: pluginOptions.waitOnRateLimit,
    }

    // Kept out of the Gatsby cache, which Gatsby empties on its own
    const {directory} = store.getState().program
    const stravaStore = createStore({
      dir: path.resolve(directory, pluginOptions.storeDir || ".strava"),
    })

    const activities = await getActivities({
      debug: pluginOptions.debug,
      options: pluginOptions.activities,
      rateLimit,
      cache,
      reporter,
      store: stravaStore,
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

    const athlete = await fetchWithRateLimit({
      fetch: () => getAthlete({options: pluginOptions.athlete}),
      options: rateLimit,
      reporter,
    })

    if (!athlete) {
      reporter.warn("source-strava: Athlete not fetched")
      return
    }

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
