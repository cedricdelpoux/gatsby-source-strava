const path = require("path")

const getActivities = require("./utils/activities.js")
const getAthlete = require("./utils/athlete.js")
const {normalizeActivity, normalizeIds} = require("./utils/normalize.js")
const {fetchWithRateLimit} = require("./utils/rate-limit.js")
const {createStore} = require("./utils/store.js")
const {strava} = require("./utils/strava.js")
const {types} = require("./utils/types.js")
const {watchStore} = require("./utils/watch.js")

exports.createSchemaCustomization = ({actions}) => {
  actions.createTypes(types)
}

exports.sourceNodes = async (
  {actions, createContentDigest, reporter, cache, store, getNode},
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
    const storeDir = path.resolve(
      directory,
      pluginOptions.storeDir || ".strava"
    )
    const stravaStore = createStore({dir: storeDir})

    // The activity is normalized before `extend` runs, so that a site adding
    // its own fields reads it in the shape it will query it in, and so that
    // whatever it adds passes through untouched
    const createActivityNode = (activity) => {
      const normalized = normalizeActivity(activity)

      if (pluginOptions.activities && pluginOptions.activities.extend) {
        pluginOptions.activities.extend({activity: normalized})
      }

      actions.createNode({
        ...normalized,
        id: normalized.id.toString(),
        internal: {
          type: "StravaActivity",
          contentDigest: createContentDigest(normalized),
        },
      })
    }

    const {activities, fetchedCount} = await getActivities({
      debug: pluginOptions.debug,
      options: pluginOptions.activities,
      rateLimit,
      cache,
      reporter,
      store: stravaStore,
    })

    if (activities && activities.length > 0) {
      activities.forEach(createActivityNode)

      reporter.success(`source-strava: ${fetchedCount} new activities fetched`)
    }

    // `gatsby-source-strava-activity`, refetching one activity while the dev
    // server is running, would otherwise need a full restart to show up
    if (store.getState().program._[0] === "develop") {
      watchStore({storeDir, actions, createActivityNode, getNode, reporter})
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

    const normalizedAthlete = normalizeIds(athlete)

    if (pluginOptions.athlete && pluginOptions.athlete.extend) {
      // The activities are normalized here rather than upfront, so that a
      // site not using this option pays nothing for it
      pluginOptions.athlete.extend({
        activities: activities ? activities.map(normalizeActivity) : activities,
        athlete: normalizedAthlete,
      })
    }

    actions.createNode({
      ...normalizedAthlete,
      id: normalizedAthlete.id.toString(),
      internal: {
        type: "StravaAthlete",
        contentDigest: createContentDigest(normalizedAthlete),
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
