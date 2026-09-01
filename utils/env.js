const fs = require("fs")
const glob = require("glob")

const getEnvFiles = () => {
  const envFiles = glob.sync(".env*")

  return envFiles.length > 0 ? envFiles : [".env"]
}

const parseEnv = (content) => {
  const variables = {}

  content.split("\n").forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) return

    const separator = trimmed.indexOf("=")

    if (separator === -1) return

    const name = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()

    variables[name] = value.replace(/^(['"])(.*)\1$/, "$2")
  })

  return variables
}

// The command line scripts are run on their own, without the `dotenv` call a
// `gatsby-config.js` makes. Existing variables win, so that an environment set
// by a CI is not overwritten by a file left over in the project.
const loadEnvFiles = () => {
  getEnvFiles().forEach((file) => {
    if (!fs.existsSync(file)) return

    const variables = parseEnv(fs.readFileSync(file, "utf8"))

    Object.keys(variables).forEach((name) => {
      if (process.env[name] === undefined) {
        process.env[name] = variables[name]
      }
    })
  })
}

// Sets the variable in place when it is already there, so that running the
// command again refreshes the token instead of stacking an outdated one
const setEnvVariable = (content, name, value) => {
  const line = `${name}=${value}`
  const lines = content ? content.replace(/\n+$/, "").split("\n") : []
  const isVariable = (existing) => existing.startsWith(`${name}=`)
  const index = lines.findIndex(isVariable)
  const others = lines.filter((existing) => !isVariable(existing))

  if (index === -1) {
    others.push(line)
  } else {
    others.splice(index, 0, line)
  }

  return others.join("\n") + "\n"
}

const writeToEnvFiles = (name, value) => {
  try {
    getEnvFiles().forEach((file) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""

      fs.writeFileSync(file, setEnvVariable(content, name, value))
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getEnvFiles,
  loadEnvFiles,
  parseEnv,
  setEnvVariable,
  writeToEnvFiles,
}
