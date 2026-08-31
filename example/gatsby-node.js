exports.createSchemaCustomization = ({actions}) => {
  const {createTypes} = actions

  // `geoJSON` is added by the `activities.extend` option in gatsby-config.js.
  // Every other Strava field is declared by the plugin itself.
  createTypes(`
    type GeoJSON {
      type: String!
      coordinates: [[Float!]!]!
    }

    type StravaActivityMap {
      geoJSON: GeoJSON
    }
  `)
}
