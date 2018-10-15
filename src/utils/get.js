const strava = require("strava-v3")
const Promise = require(`bluebird`)

const get = async ({args, method: {category, name}, format}) => {
  return new Promise(async (resolve, reject) => {
    try {
      await strava[category][name](args, function(err, payload, limits) {
        if (err) {
          reject(
            `Strava api error: ${err.msg} during strava.${category}.${name}`
          )
        }
        // else if (limits) {
        //   // reject("Strava api limits reached")
        // }
        else {
          if (format) {
            resolve(format(payload))
          } else {
            resolve(payload)
          }
        }
      })
    } catch (e) {
      console.error(e)
    }
  })
}

module.exports = {get}
