import {Layer, Source} from "@urbica/react-map-gl"

import React from "react"

const tileToFeature = (tile) => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [tile.coords],
  },
})

const tilesToFeatureCollection = (tiles) => ({
  type: "FeatureCollection",
  features: tiles.map((tile) => tileToFeature(tile)),
})

export const Tiles = ({
  id,
  tiles,
  color,
  fillOpacity = 0.1,
  borderOpacity = 0.1,
}) => (
  <>
    <Source id={id} type="geojson" data={tilesToFeatureCollection(tiles)} />
    <Layer
      id={id}
      type="fill"
      source={id}
      paint={{
        "fill-color": color,
        "fill-opacity": fillOpacity,
      }}
    />
    <Layer
      id={`${id}_borders`}
      type="line"
      source={id}
      paint={{
        "line-color": color,
        "line-width": 2,
        "line-opacity": borderOpacity,
      }}
    />
  </>
)
