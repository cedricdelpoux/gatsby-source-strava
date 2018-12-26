const get = require("./get.js")

const getAthlete = async ({
  token,
  options: {
    withKoms = false,
    withRoutes = false,
    withStats = false,
    withZones = false,
  },
}) => {
  try {
    const athlete = await get({
      args: {access_token: token},
      method: {category: "athlete", name: "get"},
    })

    const koms = withKoms
      ? await getAthleteKoms({
          athleteId: athlete.id,
          token,
        })
      : null

    const routes = withRoutes
      ? await getAthleteRoutes({
          token,
        })
      : null

    const stats = withStats
      ? await getAthleteStats({
          athleteId: athlete.id,
          token,
        })
      : null

    const zones = withZones
      ? await getAthleteZones({
          token,
        })
      : null

    const athleteWithOptions = {
      ...athlete,
      ...(koms ? {koms} : {}),
      ...(routes ? {routes} : {}),
      ...(stats ? {stats} : {}),
      ...(zones ? {zones} : {}),
    }

    return athleteWithOptions
  } catch (e) {
    throw e
  }
}

const getAthleteZones = ({token: access_token}) =>
  get({
    args: {access_token},
    method: {category: "athlete", name: "listZones"},
  })

const getAthleteRoutes = ({token: access_token}) =>
  get({
    args: {access_token},
    method: {category: "athlete", name: "listRoutes"},
  })

const getAthleteStats = ({token: access_token, athleteId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "athletes", name: "stats"},
  })

const getAthleteKoms = ({token: access_token, athleteId: id}) =>
  get({
    args: {id, access_token},
    method: {category: "athletes", name: "listKoms"},
  })

module.exports = getAthlete
