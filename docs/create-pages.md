# gatsby-node.js

A short exemple of `gatsby-node.js` to create pages for activities

```js
const path = require("path")

exports.createPages = async ({graphql, actions, reporter}) => {
    const {createPage} = actions

    const {data, errors} = await graphql(`
        {
            activities: allStravaActivity {
                nodes {
                    id
                    name
                }
            }
        }
    `)

    if (errors) {
        reporter.panicOnBuild("Error while querying Strava activities", errors)
        return
    }

    data.activities.nodes.forEach((activity) => {
        createPage({
            path: `/activity/${activity.id}`,
            component: path.resolve("./src/templates/activity.js"),
            context: {
                id: activity.id,
            },
        })
    })
}
```

## Activity template

```js
import React from "react"
import {graphql} from "gatsby"

const Activity = ({data: {stravaActivity}}) => (
    <div>
        <h1>{stravaActivity.name}</h1>
    </div>
)

export default Activity

export const pageQuery = graphql`
    query ($id: String) {
        stravaActivity(id: {eq: $id}) {
            name
            distance
            start_date
        }
    }
`
```
