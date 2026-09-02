// A coordinate of 16 digits or more was parsed as a BigNumber, and written to
// the store as a string, by every version before the one that turns those
// decimals back into numbers. Repairing the activities already stored would
// cost a request each, thousands of them on a long history, so they are
// coerced here instead, on their way into a node. `coordinates` is built by
// the plugin rather than read from Strava, and never caught this.
const COORDINATE_FIELDS = ["start_latlng", "end_latlng"]

const toNumber = (value) =>
  typeof value === "string" && value.trim() !== "" && Number.isFinite(+value)
    ? +value
    : value

// What an activity needs on its way into a node
const normalizeActivity = (activity) => {
  const normalized = {...activity}

  COORDINATE_FIELDS.forEach((field) => {
    if (Array.isArray(normalized[field])) {
      normalized[field] = normalized[field].map(toNumber)
    }
  })

  return normalized
}

module.exports = {normalizeActivity}
