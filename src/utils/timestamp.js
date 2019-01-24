const to10DigitTimestamp = timestamp => {
  if (!timestamp) return null

  // If we got a 13 digit timestamp
  if (timestamp.toString().length === 13) {
    return Math.round(timestamp / 1000)
  }

  return Number.parseInt(timestamp)
}

module.exports = to10DigitTimestamp
