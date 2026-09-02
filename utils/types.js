// GraphQL type definitions for the nodes created by this plugin.
//
// Gatsby only infers fields it can see in the fetched data, which makes site
// queries break in two common cases: when nothing is fetched yet (fresh cache
// with an `after` option), and when a field is always empty or null in the
// data (`start_latlng` is `[]` on manual activities, `location_city` is often
// null). Declaring the Strava fields here fixes both for every site using the
// plugin, without having to redeclare them in their own `gatsby-node.js`.
//
// Inference is still active, so extra fields added through the `extend`
// options keep working.
//
// Every id is a `String`: an id is an identifier, never a quantity, and no
// number type here holds one safely. `Int` is 32 bit, which an activity id
// passed long ago; `Float` holds integers exactly only up to 2^53, which a
// segment effort id, at 19 digits, is already past. `normalize.js` is what
// turns them into strings on their way into a node, and drops the `id_str`
// twins Strava sends for that same reason.
//
// That normalization is also why so little is declared below: an id reaching
// inference as a string is typed as one, so the `comments`, `laps`, `photos`
// and `segment_efforts` added by the `gatsby-source-strava-activity` command
// need nothing here, and are left to inference as `fetch-activity.md`
// documents.

const types = `

  type StravaAthlete implements Node {
    id: ID!
    username: String
    firstname: String
    lastname: String
    bio: String
    city: String
    state: String
    country: String
    sex: String
    premium: Boolean
    summit: Boolean
    created_at: Date @dateformat
    updated_at: Date @dateformat
    badge_type_id: Int
    weight: Float
    ftp: Float
    profile: String
    profile_medium: String
    friend: String
    follower: String
    blocked: Boolean
    can_follow: Boolean
    follower_count: Int
    friend_count: Int
    mutual_friend_count: Int
    athlete_type: Int
    date_preference: String
    measurement_preference: String
    postable_clubs_count: Int
    resource_state: Int
    koms: [StravaAthleteKom]
  }

  type StravaAthleteKom {
    kom_rank: Int
    activity: StravaActivity @link(by: "id", from: "activity.id")
  }

  type StravaActivity implements Node {
    id: ID!
    external_id: String
    upload_id: String
    athlete: StravaAthlete @link(by: "id", from: "athlete.id")
    name: String
    distance: Float
    moving_time: Int
    elapsed_time: Int
    total_elevation_gain: Float
    elev_high: Float
    elev_low: Float
    type: String
    sport_type: String
    workout_type: Int
    device_name: String
    start_date: Date @dateformat
    start_date_local: Date @dateformat
    timezone: String
    utc_offset: Float
    location_city: String
    location_state: String
    location_country: String
    achievement_count: Int
    kudos_count: Int
    comment_count: Int
    athlete_count: Int
    photo_count: Int
    total_photo_count: Int
    pr_count: Int
    map: StravaActivityMap
    coordinates: [[Float!]!]
    start_latlng: [Float!]
    end_latlng: [Float!]
    trainer: Boolean
    commute: Boolean
    manual: Boolean
    private: Boolean
    visibility: String
    flagged: Boolean
    gear_id: String
    from_accepted_tag: Boolean
    average_speed: Float
    max_speed: Float
    average_cadence: Float
    average_temp: Float
    average_watts: Float
    max_watts: Float
    weighted_average_watts: Float
    device_watts: Boolean
    kilojoules: Float
    has_heartrate: Boolean
    average_heartrate: Float
    max_heartrate: Float
    heartrate_opt_out: Boolean
    display_hide_heartrate_option: Boolean
    has_kudoed: Boolean
    suffer_score: Int
    resource_state: Int
  }

  type StravaActivityMap {
    id: String
    polyline: String
    summary_polyline: String
    resource_state: Int
  }
`

module.exports = {types}
