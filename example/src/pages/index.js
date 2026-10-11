import React from "react"
import {graphql} from "gatsby"

const token = process.env.GATSBY_MAPBOX_TOKEN
const stravaColor = "fc4c02"

const Grid = ({children}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gridGap: "16px",
    }}
  >
    {children}
  </div>
)

const MapCard = ({href, name, summaryPolyline}) => {
  const polyline = encodeURIComponent(summaryPolyline)
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/path+${stravaColor}(${polyline})/auto/200x200?access_token=${token}&logo=false&attribution=false`

  return (
    <a
      href={href}
      style={{
        overflow: "hidden",
        width: 200,
        border: "1px solid #ededed",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          padding: "8px",
        }}
      >
        {name}
      </div>
      <img src={mapUrl} alt={`Map of ${name}`} style={{display: "block"}} />
    </a>
  )
}

const PageIndex = ({data: {activities, routes}}) => (
  <>
    <h2>Activities</h2>
    <Grid>
      {activities.nodes.map((activity) => (
        <MapCard
          key={activity.id}
          href={`https://www.strava.com/activities/${activity.id}`}
          name={activity.name}
          summaryPolyline={activity.map.summary_polyline}
        />
      ))}
    </Grid>
    <h2>Routes</h2>
    <Grid>
      {routes.nodes.map((route) => (
        <MapCard
          key={route.id}
          href={`https://www.strava.com/routes/${route.id}`}
          name={route.name}
          summaryPolyline={route.map.summary_polyline}
        />
      ))}
    </Grid>
  </>
)

export default PageIndex

export const pageQuery = graphql`
  query IndexQuery {
    activities: allStravaActivity(
      filter: {
        type: {in: ["Run", "Ride"]}
        map: {summary_polyline: {ne: null}}
        private: {eq: false}
      }
      sort: {start_date: DESC}
    ) {
      nodes {
        id
        name
        map {
          summary_polyline
        }
      }
    }
    routes: allStravaRoute(
      filter: {map: {summary_polyline: {ne: null}}, private: {eq: false}}
      sort: {updated_at: DESC}
    ) {
      nodes {
        id
        name
        map {
          summary_polyline
        }
      }
    }
  }
`
