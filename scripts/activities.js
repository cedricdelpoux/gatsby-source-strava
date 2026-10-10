#! /usr/bin/env node

const path = require("path")

const {buildActivity} = require("../utils/activity.js")
const {createStore} = require("../utils/store.js")
const {strava} = require("../utils/strava.js")
const {
  CONFIG_OPTIONS,
  DETAILS_OPTIONS,
  connectStrava,
  parseArgs,
  run,
  withPluginOptions,
} = require("./cli.js")

const PER_PAGE = 200

// Past this share of the store, a deletion is more likely a token that sees
// less than the one the store was built with (another athlete, or private
// activities left unchecked on the Strava authorization page) than that many
// activities actually deleted on strava.com
const MAX_DELETED_SHARE = 0.1

const usage = `Usage: gatsby-source-strava-activities [options]

Compares the store with the activities your Strava account holds today, and
lists the differences the incremental fetch cannot see: activities deleted on
strava.com, still in the store, activities missing from the store, like a
file uploaded again, which keeps its original start date, and stored
activities lacking what the plugin options ask for, like a stream asked for
after they were fetched.

Reads the plugin options from the site's gatsby-config, so that a missing
activity gets the details a build would have given it, and the comparison
stays within the plugin's after and before options.

Costs one request every ${PER_PAGE} activities. Nothing is changed unless
--write is passed.

Options:
  --write            Delete the activities gone from Strava, add the missing
                      ones, and complete the stored ones
  --force            Delete them even when they are more than a tenth of the
                      store
  --after <date>     Only compare the activities started after this date or
                      timestamp, overriding the plugin's after option
  --before <date>    Only compare the activities started before this date or
                      timestamp, overriding the plugin's before option
  --streams [types]  Add streams to the missing activities, comma separated,
                      all of them when empty
  --comments         Add comments to the missing activities
  --kudos            Add kudos to the missing activities
  --laps             Add laps to the missing activities
  --photos[=size]    Add photos to the missing activities, 1800 pixels wide
                      unless a size is given
  --zones            Add zones to the missing activities, needs a Strava
                      subscription
  --all              Every detail option above
  --dir <path>       Store directory, defaults to the plugin's storeDir option,
                      or .strava
  --config <path>    Site config to read the plugin options from, defaults to
                      the gatsby-config of the current directory
  --no-config        Rely on the options above alone
  --help             Show this message

The detail options add to the plugin options for the missing activities
alone, and cost one request each per activity, the same as
gatsby-source-strava-activity. Completing the stored activities costs one
request per detail each lacks.
`

const listAccountActivities = async ({after, before}) => {
  const activities = []

  for (let page = 1; ; page++) {
    const activitiesPage = await strava.fetch({
      args: {
        ...(after ? {after} : {}),
        ...(before ? {before} : {}),
        page,
        per_page: PER_PAGE,
      },
      method: {category: "athlete", name: "listActivities"},
    })

    activities.push(...activitiesPage)

    if (activitiesPage.length < PER_PAGE) return activities
  }
}

const formatActivity = (activity, suffix = "") =>
  `  ${activity.id}  ${activity.start_date.substring(0, 10)}  ${activity.name}${suffix}`

const DETAILS_FIELDS = {
  withComments: "comments",
  withKudos: "kudos",
  withLaps: "laps",
  withPhotos: "photos",
  withZones: "zones",
}

// What the plugin options ask for and a stored activity lacks, as options
// for `buildActivity` asking for that alone, or null when it lacks nothing.
// A stream type counts as there once asked for, null when the activity has
// no data for it, so that it is not asked for again on every run.
const getMissingDetails = (activity, details) => {
  const missingDetails = {}
  const {streamsTypes = [], withStreams} = details
  const streams = activity.streams || {}

  if (
    withStreams === true ||
    (typeof withStreams === "function" && withStreams(activity))
  ) {
    const missingTypes = streamsTypes.filter((type) => !(type in streams))

    if (missingTypes.length > 0) {
      missingDetails.withStreams = true
      missingDetails.streamsTypes = missingTypes
    }
  }

  Object.keys(DETAILS_FIELDS).forEach((option) => {
    if (details[option] && activity[DETAILS_FIELDS[option]] === undefined) {
      missingDetails[option] = details[option]
    }
  })

  return Object.keys(missingDetails).length > 0 ? missingDetails : null
}

const describeMissingDetails = (missingDetails) =>
  Object.keys(missingDetails)
    .filter((option) => option !== "streamsTypes")
    .map((option) =>
      option === "withStreams"
        ? `streams ${missingDetails.streamsTypes.join(",")}`
        : DETAILS_FIELDS[option]
    )
    .join(", ")

const syncActivities = async (argv) => {
  const args = parseArgs(argv, {
    options: [
      ...DETAILS_OPTIONS,
      ...CONFIG_OPTIONS,
      "write",
      "force",
      "after",
      "before",
      "dir",
    ],
  })
  const {force, help, write} = args

  if (help) {
    console.log(usage)

    return true
  }

  const {
    after,
    before,
    config,
    configDetails,
    details: options,
    storeDir,
  } = withPluginOptions(args)

  if (config) {
    console.log(
      `Plugin options read from ${path.relative(process.cwd(), config.file)}`
    )
  }

  await connectStrava()

  const store = createStore({dir: path.resolve(storeDir)})
  const storedActivities = await store.readActivities()
  const listDate = Date.now()
  const accountActivities = await listAccountActivities({after, before})

  // Only a stored activity strictly inside the window can be told deleted:
  // one outside was never asked for, and one right on a bound may or may not
  // be returned depending on how Strava compares it
  const isInWindow = ({start_date}) => {
    const startDate = Date.parse(start_date) / 1000

    return (!after || startDate > after) && (!before || startDate < before)
  }

  const comparedActivities = storedActivities.filter(isInWindow)
  const accountIds = new Set(accountActivities.map(({id}) => String(id)))
  const storedIds = new Set(storedActivities.map(({id}) => String(id)))

  const deleted = comparedActivities.filter(
    ({id}) => !accountIds.has(String(id))
  )
  const missing = accountActivities.filter(({id}) => !storedIds.has(String(id)))

  // Checked against the plugin options alone: a detail option on the command
  // line is for the missing activities, and would otherwise cost a request
  // on every activity of the history
  const incomplete = comparedActivities
    .filter(({id}) => accountIds.has(String(id)))
    .map((activity) => ({
      activity,
      missingDetails: getMissingDetails(activity, configDetails),
    }))
    .filter(({missingDetails}) => missingDetails !== null)
  const incompleteRequests = incomplete.reduce(
    (count, {missingDetails}) =>
      count +
      Object.keys(missingDetails).filter((o) => o !== "streamsTypes").length,
    0
  )

  console.log(`${accountActivities.length} activities on Strava`)
  console.log(`${deleted.length} deleted on Strava, still in the store`)
  deleted.forEach((activity) => console.log(formatActivity(activity)))
  console.log(`${missing.length} missing from the store`)
  missing.forEach((activity) => console.log(formatActivity(activity)))
  console.log(
    `${incomplete.length} lacking what the plugin options ask for, ` +
      `${incompleteRequests} request${incompleteRequests === 1 ? "" : "s"}`
  )
  incomplete.forEach(({activity, missingDetails}) =>
    console.log(
      formatActivity(activity, `  (${describeMissingDetails(missingDetails)})`)
    )
  )

  if (!write) {
    if (deleted.length > 0 || missing.length > 0 || incomplete.length > 0) {
      console.log("Run again with --write to update the store")
    }

    return true
  }

  if (
    !force &&
    deleted.length > comparedActivities.length * MAX_DELETED_SHARE
  ) {
    throw new Error(
      `Nothing written: ${deleted.length} of the ${comparedActivities.length} stored activities would be deleted. ` +
        "Check that STRAVA_TOKEN belongs to the right athlete and can read private activities, " +
        "then run again with --force to delete them anyway."
    )
  }

  for (const {id} of deleted) {
    await store.deleteActivity(id)
  }

  // Built the same way the source plugin builds a fetched page of
  // activities, so that an added activity has the very same shape
  for (const activity of missing) {
    await store.writeActivity(await buildActivity({activity, options}))
  }

  // The stored activity is kept as is, only what it lacks being fetched and
  // merged into it, as `gatsby-source-strava-activity` does without
  // `--refresh`. Each one is written as soon as it is complete, so that a
  // run stopped by the rate limit picks up where it left off.
  for (const {activity, missingDetails} of incomplete) {
    await store.writeActivity(
      await buildActivity({
        activity,
        existing: activity,
        options: missingDetails,
      })
    )
  }

  // The store now holds the whole account as it stood when it was listed,
  // every activity with the details the plugin options ask for, which is what
  // the cursor means: the next build can skip all of it. Only so without a
  // window, which the cursor knows nothing about, and with the plugin options
  // read, the command line ones alone giving no such guarantee.
  if (config && !after && !before) {
    await store.writeState({...(await store.readState()), lastFetch: listDate})
  }

  console.log(
    `Store updated in ${path.relative(process.cwd(), storeDir) || "."}`
  )

  return true
}

if (require.main === module) {
  run(syncActivities)
}

module.exports = {syncActivities}
