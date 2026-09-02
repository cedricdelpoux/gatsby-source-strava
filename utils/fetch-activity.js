#! /usr/bin/env node

const path = require("path")

const {buildActivity, getActivityDetails} = require("./activity.js")
const {loadEnvFiles} = require("./env.js")
const {createStore} = require("./store.js")
const {strava} = require("./strava.js")

const WITH_OPTIONS = ["comments", "kudos", "laps", "photos", "zones"]

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

const STREAMS_TYPES = [
  "time",
  "distance",
  "latlng",
  "altitude",
  "velocity_smooth",
  "heartrate",
  "cadence",
  "watts",
  "temp",
  "moving",
  "grade_smooth",
]

const isActivityId = (value) => /^\d+$/.test(value)

const parseArgs = (argv) => {
  const options = {}
  let activityId
  let storeDir = ".strava"
  let help = false
  let refresh = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    // Both `--dir path` and `--dir=path` are accepted
    const [name, inlineValue] = arg.startsWith("--")
      ? [arg.slice(2).split("=")[0], arg.split("=").slice(1).join("=")]
      : [null, null]
    const readValue = () => {
      if (inlineValue) return inlineValue

      const next = argv[i + 1]

      // An activity id is never an option value, so that a script holding
      // `--streams` still reads `gatsby-source-strava-activity 4291234567`
      if (next && !next.startsWith("--") && !isActivityId(next)) {
        i++

        return next
      }

      return null
    }

    if (name === "help") {
      help = true
    } else if (name === "refresh") {
      refresh = true
    } else if (name === "dir") {
      storeDir = readValue() || storeDir
    } else if (name === "streams") {
      options.withStreams = true
      const types = readValue()
      options.streamsTypes = types ? types.split(",") : STREAMS_TYPES
    } else if (name === "photos") {
      // Only `--photos=600` carries the size, never `--photos 600`: a bare
      // number after an option is an activity id, so that a script holding
      // `--photos` still reads the id off the command line
      if (inlineValue && !/^\d+$/.test(inlineValue)) {
        throw new Error(`\`--photos=${inlineValue}\` is not a photo size`)
      }

      options.withPhotos = inlineValue ? Number(inlineValue) : true
    } else if (name === "all") {
      refresh = true
      options.withStreams = true
      options.streamsTypes = STREAMS_TYPES
      WITH_OPTIONS.forEach((option) => {
        options[`with${option[0].toUpperCase()}${option.slice(1)}`] = true
      })
    } else if (WITH_OPTIONS.includes(name)) {
      options[`with${name[0].toUpperCase()}${name.slice(1)}`] = true
    } else if (name) {
      throw new Error(`Unknown option \`--${name}\``)
    } else if (activityId === undefined) {
      activityId = arg
    } else {
      throw new Error(`Unexpected argument \`${arg}\``)
    }
  }

  return {activityId, help, options, refresh, storeDir}
}

const fetchActivity = async (argv) => {
  const {activityId, help, options, refresh, storeDir} = parseArgs(argv)

  if (help || !activityId) {
    console.log(usage)

    return help
  }

  if (!isActivityId(activityId)) {
    throw new Error(`\`${activityId}\` is not an activity id`)
  }

  loadEnvFiles()

  const {STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_TOKEN} = process.env

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_TOKEN) {
    throw new Error(
      "Missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET or STRAVA_TOKEN. Run `gatsby-source-strava-token` first."
    )
  }

  await strava.init({
    clientId: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET,
    token: STRAVA_TOKEN,
  })

  const store = createStore({dir: path.resolve(storeDir)})
  const existing = await store.readActivity(activityId)

  // The first fetch of an activity always needs its details, whether or not
  // `--refresh` was passed: there is nothing yet to add options onto
  const fetchDetails = refresh || !existing

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
  fetchActivity(process.argv.slice(2))
    .then((done) => process.exit(done ? 0 : 1))
    .catch((e) => {
      console.error(e.message)
      process.exit(1)
    })
}

module.exports = {fetchActivity, parseArgs}
