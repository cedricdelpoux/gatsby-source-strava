// Strava sends an id twice: once as a number, and again as an `id_str`
// string, because a 64 bit id does not survive a double — a segment effort
// id, at 19 digits, is already past what one holds exactly. That leaves every
// id in two shapes, and a site reaching for the wrong one gets a rounded
// number back.
//
// So an id becomes a string here, once, on its way into a node, and the
// `_str` twins are dropped along with it, having nothing left to add. An id
// is an identifier, never a quantity — nothing is ever summed or averaged
// from one — and a string holds any of them whole, whatever Strava does with
// their size next.
//
// This is also what keeps a filter working: Gatsby matches against the value
// it stored, not the one it hands back, so declaring an id a `String` in
// `types.js` is only half of it. Without this, `upload_id: {eq: "10055306406"}`
// quietly matches nothing at all.
//
// A `type_id` is left as it is: `badge_type_id`, or the `type_id` of an
// achievement, is a code among a handful, not an identifier.

// A coordinate of 16 digits or more was parsed as a BigNumber, and written to
// the store as a string, by every version before the one that turns those
// decimals back into numbers. Repairing the activities already stored would
// cost a request each, thousands of them on a long history, so they are
// coerced here instead, on their way into a node. `coordinates` is built by
// the plugin rather than read from Strava, and never caught this.
const COORDINATE_FIELDS = ["start_latlng", "end_latlng"]

// Strava embeds, on every lap, effort, comment and photo, a backlink to the
// activity and the athlete they belong to — the very ones being read. A long
// ride carries 240 copies of those same two ids, and the schema ends up
// offering `laps { activity { name } }`, a way round to a name sitting one
// level up.
//
// `comments[].athlete` is the exception kept: that one is whoever left the
// comment, another person entirely, not the activity's own athlete.
const REDUNDANT_ACTIVITY_FIELDS = {
  comments: ["activity_id"],
  laps: ["activity", "athlete"],
  photos: ["activity_id", "activity_name", "athlete_id"],
  segment_efforts: ["activity", "athlete"],
}

// The athlete's koms are efforts too, and carry the same two backlinks. Only
// one of them is redundant here: a kom points at whichever activity set it,
// which is the one thing the list does not otherwise say.
const REDUNDANT_ATHLETE_FIELDS = {
  koms: ["athlete"],
}

const pruneRedundant = (node, fields) => {
  Object.keys(fields).forEach((collection) => {
    const items = node[collection]

    if (!Array.isArray(items)) return

    items.forEach((item) => {
      fields[collection].forEach((field) => {
        delete item[field]
      })
    })
  })
}

const ID_TWIN_SUFFIX = "_str"

const isId = (key) =>
  (key === "id" || key.endsWith("_id")) && !key.endsWith("type_id")

const isIdTwin = (key) =>
  key.endsWith(ID_TWIN_SUFFIX) && isId(key.slice(0, -ID_TWIN_SUFFIX.length))

const normalizeIds = (value) => {
  if (Array.isArray(value)) return value.map(normalizeIds)

  if (value && typeof value === "object") {
    const plain = {}

    Object.keys(value).forEach((key) => {
      if (isIdTwin(key)) return

      const nested = value[key]

      // An id Strava left null, `upload_id` on an activity added by hand for
      // instance, stays null rather than turning into the string "null"
      plain[key] =
        isId(key) && (typeof nested === "number" || typeof nested === "string")
          ? String(nested)
          : normalizeIds(nested)
    })

    return plain
  }

  return value
}

const toNumber = (value) =>
  typeof value === "string" && value.trim() !== "" && Number.isFinite(+value)
    ? +value
    : value

// What an activity needs on its way into a node: its ids, the backlinks it
// repeats, and the coordinates a store filled over several versions can hold
const normalizeActivity = (activity) => {
  const normalized = normalizeIds(activity)

  COORDINATE_FIELDS.forEach((field) => {
    if (Array.isArray(normalized[field])) {
      normalized[field] = normalized[field].map(toNumber)
    }
  })

  pruneRedundant(normalized, REDUNDANT_ACTIVITY_FIELDS)

  return normalized
}

// The athlete needs none of the shapes above, only its ids and the backlinks
// its koms carry
const normalizeAthlete = (athlete) => {
  const normalized = normalizeIds(athlete)

  pruneRedundant(normalized, REDUNDANT_ATHLETE_FIELDS)

  return normalized
}

module.exports = {normalizeActivity, normalizeAthlete}
