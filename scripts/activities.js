#! /usr/bin/env node

const path = require("path")

const {buildActivity} = require("../utils/activity.js")
const {createStore} = require("../utils/store.js")
const {strava} = require("../utils/strava.js")
const {DETAILS_OPTIONS, connectStrava, parseArgs, run} = require("./cli.js")

const PER_PAGE = 200

// Past this share of the store, a deletion is more likely a token that sees
// less than the one the store was built with (another athlete, or private
// activities left unchecked on the Strava authorization page) than that many
// activities actually deleted on strava.com
const MAX_DELETED_SHARE = 0.1

const usage = `Usage: gatsby-source-strava-activities [options]

Compares the store with the activities your Strava account holds today, and
lists the differences the incremental fetch cannot see: activities deleted on
strava.com, still in the store, and activities missing from the store, like a
file uploaded again, which keeps its original start date.

Costs one request every ${PER_PAGE} activities. Nothing is changed unless
--write is passed.

Options:
  --write            Delete the activities gone from Strava and add the
                      missing ones
  --force            Delete them even when they are more than a tenth of the
                      store
  --after <date>     Only compare the activities started after this date or
                      timestamp, as the plugin's \`after\` option
  --before <date>    Only compare the activities started before this date or
                      timestamp, as the plugin's \`before\` option
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
  --dir <path>       Store directory, defaults to .strava
  --help             Show this message

Each detail option costs one request per missing activity, the same as
gatsby-source-strava-activity.
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

const formatActivity = (activity) =>
  `  ${activity.id}  ${activity.start_date.substring(0, 10)}  ${activity.name}`

const syncActivities = async (argv) => {
  const {
    after,
    before,
    details: options,
    force,
    help,
    storeDir,
    write,
  } = parseArgs(argv, {
    options: [...DETAILS_OPTIONS, "write", "force", "after", "before", "dir"],
  })

  if (help) {
    console.log(usage)

    return true
  }

  await connectStrava()

  const store = createStore({dir: path.resolve(storeDir)})
  const storedActivities = await store.readActivities()
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

  console.log(`${accountActivities.length} activities on Strava`)
  console.log(`${deleted.length} deleted on Strava, still in the store`)
  deleted.forEach((activity) => console.log(formatActivity(activity)))
  console.log(`${missing.length} missing from the store`)
  missing.forEach((activity) => console.log(formatActivity(activity)))

  if (deleted.length === 0 && missing.length === 0) {
    return true
  }

  if (!write) {
    console.log("Run again with --write to update the store")

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

  console.log(`Store updated in ${storeDir}`)

  return true
}

if (require.main === module) {
  run(syncActivities)
}

module.exports = {syncActivities}
