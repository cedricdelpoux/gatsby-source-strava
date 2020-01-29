# gatsby-node.js

A short exemple of `gatsby-node.js` to create pages for activities

```js
module.exports.createPages = ({graphql, actions}) => {
    const {createPage} = actions
    return new Promise((resolve, reject) => {
        resolve(
            graphql(`
                {
                    activities: allStravaActivity {
                        edges {
                            node {
                                activity {
                                    id
                                }
                            }
                        }
                    }
                }
            `).then(({data: {activities}}) => {
                activities.edges.forEach(({node: {activity}}) => {
                    createPage({
                        path: `/activity/${activity.id}`,
                        component: path.resolve(
                            "./src/templates/activity/index.js"
                        ),
                        context: {
                            id: parseInt(activity.id),
                        },
                    })
                })
            })
        )
    })
}
```

## Activity template

```js
export default ({
    data: {
        stravaActivity: {activity},
    },
}) => (
    <div>
        <h1>{activity.name}</h1>
    </div>
)
export const pageQuery = graphql`
    query($id: Float) {
        stravaActivity(activity: {id: {eq: $id}}) {
            activity {
                name
            }
        }
    }
`
```
