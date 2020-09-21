#! /usr/bin/env node

const express = require("express")
const fs = require("fs")
const glob = require("glob")
const inquirer = require("inquirer")
const open = require("open")
const strava = require("strava-v3")

const envFiles = glob.sync(".env*")

if (envFiles.length === 0) {
  envFiles.push(".env")
}

const writeToEnvFiles = (name, value) => {
  try {
    envFiles.forEach((file) => {
      fs.appendFileSync(file, `${name}=${value}\n`)
    })
  } catch (e) {
    throw new Error(e)
  }
}

const getAuthorizationCode = async (authUrl) => {
  return new Promise((resolve, reject) => {
    const app = express()

    app.listen(5000, async () => {
      open(authUrl)
    })

    app.get("/callback", (req, res) => {
      if (req.query.code) {
        res.send(
          "Succeed! You can close this tab and go back to your terminal."
        )

        resolve(req.query.code)
      } else {
        reject("no code")
      }
    })
  })
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

    strava.config({
      client_id,
      client_secret,
      redirect_uri: "http://localhost:5000/callback",
    })

    const authUrl = await strava.oauth.getRequestAccessURL({
      scope: "activity:read_all,profile:read_all",
    })

    const code = await getAuthorizationCode(authUrl)
    const stravaToken = await strava.oauth.getToken(code)
    const {access_token, refresh_token, expires_at, expires_in} = stravaToken

    writeToEnvFiles(
      "STRAVA_TOKEN",
      JSON.stringify({access_token, refresh_token, expires_at, expires_in})
    )

    console.log("")
    console.log("Token added successfully to your .env files")
    console.log("Enjoy `gatsby-remark-strava` plugin")

    process.exit()
  } catch (e) {
    console.error(e.message)
  }
}

generateToken()
