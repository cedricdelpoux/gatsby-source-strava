import {Layer, Source} from "@urbica/react-map-gl"

import React from "react"

const activityToFeature = (activity) => ({
  type: "Feature",
  geometry: {
    coordinates: activity.coordinates,
    type: "LineString",
  },
})

const activitiesToFeatureCollection = (activities) => ({
  type: "FeatureCollection",
  features: activities.map((activity) => activityToFeature(activity)),
})

export const Activities = ({id, activities, color}) => (
  <>
    <Source
      id={id}
      type="geojson"
      data={activitiesToFeatureCollection(activities)}
    />
    <Layer
      id={id}
      type="line"
      source={id}
      layout={{
        "line-join": "round",
        "line-cap": "round",
      }}
      paint={{
        "line-color": color,
        "line-width": 2,
        "line-opacity": 0.5,
      }}
    />
  </>
)
