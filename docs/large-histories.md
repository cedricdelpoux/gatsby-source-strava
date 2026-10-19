# Large histories

With a few thousand activities, a page query on `allStravaActivity` can take
minutes, even when it only asks for a few small fields. To answer it, Gatsby
reads every `StravaActivity` node whole, `coordinates` and `streams` included,
and the more activities have their full streams, the heavier those nodes are.

For about 4000 activities, a query asking only for the `id`, `name`,
`sport_type`, `start_date` and `distance` of each activity took 24 seconds,
and a home page query reading a few more fields took more than 2 minutes of a
4 minute build.

## Querying a summary node instead

Build one node holding only what your pages need, from your own
`gatsby-node.js`, and query it instead of `allStravaActivity`. Reading the
nodes from `gatsby-node.js` is fast, the slow part is the page query.

```js
// gatsby-node.js
exports.createSchemaCustomization = ({actions}) => {
    actions.createTypes(`
        type ActivitySummary {
            id: ID!
            name: String
            sport_type: String
            start_date: String
            distance: Float
        }

        type ActivitySummaries implements Node @dontInfer {
            activities: [ActivitySummary!]!
        }
    `)
}

const toActivitySummary = (activityNode) => ({
    id: activityNode.id,
    name: activityNode.name,
    sport_type: activityNode.sport_type,
    start_date: activityNode.start_date,
    distance: activityNode.distance,
})

exports.onPostBootstrap = ({actions, createContentDigest, getNodesByType}) => {
    const activities = getNodesByType("StravaActivity").map(toActivitySummary)

    actions.createNode({
        id: "activity-summaries",
        activities,
        internal: {
            type: "ActivitySummaries",
            contentDigest: createContentDigest(activities),
        },
    })
}
```

```graphql
query {
    activitySummaries {
        activities {
            id
            name
            sport_type
            start_date
            distance
        }
    }
}
```

On the same 4000 activities, the home page query went from more than 2
minutes to under 2 seconds.

`onPostBootstrap` runs after every plugin has created its nodes and fields, so
the summary can also take fields from other plugins, like the `Declutter`
nodes of [gatsby-strava-declutter](https://github.com/cedricdelpoux/gatsby-strava-declutter).
Declare its types explicitly, as above.

The summary is rebuilt at every build, and its page queries only run again
when it changes.
