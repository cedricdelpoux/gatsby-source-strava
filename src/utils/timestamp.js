const to10DigitTimestamp = timestamp => {
  if (!timestamp) return null

  // 13 digit timestamp
  if (timestamp.toString().length === 13) {
    // 10 digit timestamp
    return Math.round(timestamp / 1000)
  }

  return Number.parseInt(timestamp)
}

module.exports = {to10DigitTimestamp}
