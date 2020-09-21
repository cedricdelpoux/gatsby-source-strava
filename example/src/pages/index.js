import React from "react"
import {graphql} from "gatsby"

const token = process.env.GATSBY_MAPBOX_TOKEN
const stravaColor = "fc4c02"
export default ({data: {activities}}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gridGap: "16px",
      }}
    >
      {activities.nodes.map(({activity}) => {
        const polyline = encodeURIComponent(activity.map.summary_polyline)
        const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/path+${stravaColor}(${polyline})/auto/200x200?access_token=${token}&logo=false&attribution=false`
        return (
          <a
            key={activity.id}
            href={`https://www.strava.com/activities/${activity.id}`}
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
              {activity.name}
            </div>
            <img
              src={mapUrl}
              alt={`Activity map ${activity.id}`}
              style={{display: "block"}}
            />
          </a>
        )
      })}
    </div>
  )
}

export const pageQuery = graphql`
  query IndexQuery {
    activities: allStravaActivity(
      filter: {
        activity: {
          type: {in: ["Run", "Ride"]}
          map: {summary_polyline: {ne: null}}
        }
      }
      sort: {fields: [activity___start_date], order: DESC}
    ) {
      nodes {
        activity {
          id
          name
          map {
            summary_polyline
          }
        }
      }
    }
  }
`
