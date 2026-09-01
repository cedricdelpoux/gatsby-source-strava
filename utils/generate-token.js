#! /usr/bin/env node

const express = require("express")
const inquirer = require("inquirer")
const open = require("open")
const strava = require("strava-v3")

const {writeToEnvFiles} = require("./env.js")

// Waits for Strava to call back with an authorization code. The port is picked
// by the system: a hardcoded one fails as soon as something else listens on it,
// the AirPlay receiver owns 5000 on macOS. Strava only checks the callback
// domain, not its port, so any port works.
const startCallbackServer = async () => {
  const app = express()

  const code = new Promise((resolve, reject) => {
    app.get("/callback", (req, res) => {
      if (req.query.code) {
        res.send(
          "Succeed! You can close this tab and go back to your terminal."
        )

        resolve(req.query.code)
      } else {
        res.send("Authorization failed. Go back to your terminal and retry.")

        reject(new Error("Strava did not return an authorization code"))
      }
    })
  })

  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, () => resolve(listening))

    listening.on("error", reject)
  })

  return {
    code,
    port: server.address().port,
    close: () => server.close(),
  }
}

const generateToken = async () => {
  try {
    console.log("Create a Strava application API at")
    console.log("https://www.strava.com/settings/api")
    console.log("")
    console.log("Copy your `Client ID` and `Client secret`")

    const {client_id, client_secret} = await inquirer.prompt([
      {
        type: "input",
        name: "client_id",
        message: "Strava Client ID:",
        validate: (input) => !!input,
      },
      {
        type: "input",
        name: "client_secret",
        message: "Strava Client Secret:",
        validate: (input) => !!input,
      },
    ])

    writeToEnvFiles("STRAVA_CLIENT_ID", client_id)
    writeToEnvFiles("STRAVA_CLIENT_SECRET", client_secret)

    const callbackServer = await startCallbackServer()

    strava.config({
      client_id,
      client_secret,
      redirect_uri: `http://localhost:${callbackServer.port}/callback`,
    })

    const authUrl = await strava.oauth.getRequestAccessURL({
      scope: "activity:read_all,profile:read_all",
    })

    await open(authUrl)

    const code = await callbackServer.code

    callbackServer.close()

    const stravaToken = await strava.oauth.getToken(code)
    const {access_token, refresh_token, expires_at, expires_in} = stravaToken

    writeToEnvFiles(
      "STRAVA_TOKEN",
      JSON.stringify({access_token, refresh_token, expires_at, expires_in})
    )

    console.log("")
    console.log("Token added successfully to your .env files")
    console.log("Enjoy `gatsby-source-strava` plugin")

    process.exit()
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

if (require.main === module) {
  generateToken()
}

module.exports = {generateToken, startCallbackServer}
