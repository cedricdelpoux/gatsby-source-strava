const {loadEnvFiles} = require("../utils/env.js")
const {strava} = require("../utils/strava.js")
const {loadPluginOptions} = require("./config.js")

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

const WITH_OPTIONS = ["comments", "kudos", "laps", "photos", "zones"]

// The options adding details to an activity, which mean the same for every
// command taking them, `buildActivity` doing the work behind all of them
const DETAILS_OPTIONS = ["streams", ...WITH_OPTIONS, "all"]

// The options reading the site's `gatsby-config`, taken by every command that
// fetches activities
const CONFIG_OPTIONS = ["config", "no-config"]

const FLAGS = [
  "all",
  "force",
  "help",
  "no-config",
  "refresh",
  "write",
  ...WITH_OPTIONS,
]

const isActivityId = (value) => /^\d+$/.test(value)

const withOption = (name) => `with${name[0].toUpperCase()}${name.slice(1)}`

// Either a timestamp, the way the plugin's `after` and `before` options take
// it, or a date, which is what one has in mind on a command line
const parseDate = (name, value) => {
  const timestamp = !value
    ? NaN
    : /^\d+$/.test(value)
      ? Number(value.length === 13 ? Math.round(value / 1000) : value)
      : Math.round(Date.parse(value) / 1000)

  if (Number.isNaN(timestamp)) {
    throw new Error(`\`--${name}\` needs a date or a timestamp`)
  }

  return timestamp
}

// Shared by every command, so that an option is written and understood the
// same way wherever it is accepted. A command lists the options it takes,
// `--help` being always one of them, and any other fails rather than being
// silently ignored. `withActivityId` lets it take an activity id as its only
// argument.
const parseArgs = (argv, {options: accepted, withActivityId = false}) => {
  const args = {
    activityId: undefined,
    after: null,
    all: false,
    before: null,
    configPath: null,
    details: {},
    force: false,
    help: false,
    noConfig: false,
    refresh: false,
    storeDir: null,
    write: false,
  }

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
      if (
        next &&
        !next.startsWith("--") &&
        !(withActivityId && isActivityId(next))
      ) {
        i++

        return next
      }

      return null
    }

    if (name === null) {
      if (!withActivityId || args.activityId !== undefined) {
        throw new Error(`Unexpected argument \`${arg}\``)
      }

      args.activityId = arg
    } else if (name !== "help" && !accepted.includes(name)) {
      throw new Error(`Unknown option \`--${name}\``)
    } else if (FLAGS.includes(name) && inlineValue && name !== "photos") {
      throw new Error(`\`--${name}\` takes no value`)
    } else if (name === "dir") {
      args.storeDir = readValue()
    } else if (name === "config") {
      args.configPath = readValue()

      if (!args.configPath) {
        throw new Error("`--config` needs a path")
      }
    } else if (name === "no-config") {
      args.noConfig = true
    } else if (name === "after" || name === "before") {
      args[name] = parseDate(name, readValue())
    } else if (name === "streams") {
      const types = readValue()

      args.details.withStreams = true
      args.details.streamsTypes = types ? types.split(",") : STREAMS_TYPES
    } else if (name === "photos") {
      // Only `--photos=600` carries the size, never `--photos 600`: a bare
      // number after an option is an activity id, so that a script holding
      // `--photos` still reads the id off the command line
      if (inlineValue && !/^\d+$/.test(inlineValue)) {
        throw new Error(`\`--photos=${inlineValue}\` is not a photo size`)
      }

      args.details.withPhotos = inlineValue ? Number(inlineValue) : true
    } else if (name === "all") {
      args.all = true
      args.details.withStreams = true
      args.details.streamsTypes = STREAMS_TYPES
      WITH_OPTIONS.forEach((option) => {
        args.details[withOption(option)] = true
      })
    } else if (WITH_OPTIONS.includes(name)) {
      args.details[withOption(name)] = true
    } else {
      args[name] = true
    }
  }

  return args
}

// The plugin options from the site's `gatsby-config`, with the command line
// ones on top: a detail option adds to the config or overrides it, as do
// `--after`, `--before` and `--dir`
const withPluginOptions = (args) => {
  const config = args.noConfig
    ? null
    : loadPluginOptions({configPath: args.configPath})

  return {
    after: args.after || (config && config.after),
    before: args.before || (config && config.before),
    config,
    configDetails: (config && config.details) || {},
    details: {...(config && config.details), ...args.details},
    storeDir: args.storeDir || (config && config.storeDir) || ".strava",
  }
}

// The commands are run on their own, without the `dotenv` call a
// `gatsby-config.js` makes, hence the `.env` files read here
const connectStrava = async () => {
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
}

// A command takes the arguments and resolves to whether it succeeded. Exiting
// here, rather than letting node wind down, is what stops a command whose
// work is done while a socket or a prompt still holds the event loop.
const run = (command) =>
  command(process.argv.slice(2))
    .then((done) => process.exit(done ? 0 : 1))
    .catch((e) => {
      console.error(e.message)
      process.exit(1)
    })

module.exports = {
  CONFIG_OPTIONS,
  DETAILS_OPTIONS,
  connectStrava,
  isActivityId,
  parseArgs,
  run,
  withPluginOptions,
}
