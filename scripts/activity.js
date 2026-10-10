#! /usr/bin/env node

const path = require("path")

const {buildActivity, getActivityDetails} = require("../utils/activity.js")
const {createStore} = require("../utils/store.js")
const {
  DETAILS_OPTIONS,
  connectStrava,
  isActivityId,
  parseArgs,
  run,
} = require("./cli.js")

const usage = `Usage: gatsby-source-strava-activity <activityId> [options]

Fetches one activity from Strava and replaces its file in the store, to pick up
an activity edited on strava.com or to add details to it.

Never drops what an earlier run already added: asking for one stream keeps the
others, and skipping an option this time keeps what it fetched before.

Options:
  --streams [types]  Add streams, comma separated, all of them when empty
  --comments         Add comments
  --kudos            Add kudos
  --laps             Add laps
  --photos[=size]    Add photos, 1800 pixels wide unless a size is given.
                      Strava answers one size per photo, capped at the
                      photo's own resolution
  --zones            Add zones, needs a Strava subscription
  --refresh          Re-fetch the activity itself, to pick up an edit made on
                      strava.com. Costs one request; skipped by default, and
                      implied the first time an activity is fetched
  --all              Every option above, --refresh included
  --dir <path>       Store directory, defaults to .strava
  --help             Show this message

Options can be preset in a package.json script, the activity id being passed on
the command line:

  "scripts": {
    "fetch-activity": "gatsby-source-strava-activity --streams latlng"
  }

  yarn fetch-activity 4291234567
`

const fetchActivity = async (argv) => {
  const {
    activityId,
    all,
    details: options,
    help,
    refresh,
    storeDir,
  } = parseArgs(argv, {
    options: [...DETAILS_OPTIONS, "refresh", "dir"],
    withActivityId: true,
  })

  if (help || !activityId) {
    console.log(usage)

    return help
  }

  if (!isActivityId(activityId)) {
    throw new Error(`\`${activityId}\` is not an activity id`)
  }

  await connectStrava()

  const store = createStore({dir: path.resolve(storeDir)})
  const existing = await store.readActivity(activityId)

  // The first fetch of an activity always needs its details, whether or not
  // `--refresh` was passed: there is nothing yet to add options onto. `--all`
  // includes `--refresh` here, the only command where it means anything.
  const fetchDetails = refresh || all || !existing

  if (!fetchDetails && Object.keys(options).length === 0) {
    throw new Error(
      "Nothing to fetch: pass --refresh, or an option like --streams, --photos..."
    )
  }

  const activity = fetchDetails
    ? await getActivityDetails({activityId})
    : existing
  const activityFull = await buildActivity({activity, existing, options})

  await store.writeActivity(activityFull)

  console.log(`${activityFull.name}`)
  console.log(`Stored in ${path.join(storeDir, "activities")}`)

  return true
}

if (require.main === module) {
  run(fetchActivity)
}

module.exports = {fetchActivity}
