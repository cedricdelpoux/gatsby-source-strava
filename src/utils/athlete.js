const {get} = require("./strava.js")

const getAthlete = async ({
  options: {
    withKoms = false,
    withRoutes = false,
    withStats = false,
    withZones = false,
  },
}) => {
  const athlete = await get({
    args: {},
    method: {category: "athlete", name: "get"},
  })

  const koms = withKoms
    ? await getAthleteKoms({
        athleteId: athlete.id,
      })
    : null

  const routes = withRoutes ? await getAthleteRoutes() : null

  const stats = withStats
    ? await getAthleteStats({
        athleteId: athlete.id,
      })
    : null

  const zones = withZones ? await getAthleteZones() : null

  const athleteWithOptions = {
    ...athlete,
    ...(koms ? {koms} : {}),
    ...(routes ? {routes} : {}),
    ...(stats ? {stats} : {}),
    ...(zones ? {zones} : {}),
  }

  return athleteWithOptions
}

const getAthleteZones = () =>
  get({
    args: {},
    method: {category: "athlete", name: "listZones"},
  })

const getAthleteRoutes = () =>
  get({
    args: {},
    method: {category: "athlete", name: "listRoutes"},
  })

const getAthleteStats = ({athleteId: id}) =>
  get({
    args: {id},
    method: {category: "athletes", name: "stats"},
  })

const getAthleteKoms = ({athleteId: id}) =>
  get({
    args: {id},
    method: {category: "athletes", name: "listKoms"},
  })

module.exports = getAthlete
