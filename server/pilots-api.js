const axios = require('axios')

const logger = require('./logger')
const { withExpBackoff } = require('./with-exp-backoff')

const getData = withExpBackoff(function getPilotData(drone) {
  return axios.get(`${process.env.PILOT_API_URL}/${drone.serialNumber}`, { timeout: parseInt(process.env.API_REQUEST_TIMEOUT) })
}, {
  maxDelay: process.env.MAX_BACKOFF_DELAY_MS
})

async function getPilotData(drone) {
  try {
    logger.debug(`Attempting to get pilot info for drone ${drone.serialNumber}`)
    const response = await getData(drone)
    logger.silly(`Pilot data:`, response.data)
    return response.data
  } catch (e) {
    if (e.response) {
      logger.debug(e.response)
      return null
    } else if (e.request) {
      logger.info(`No response from pilot api`)
      return null
    } else {
      logger.error(`Encountered error while setting up request to pilot api: ${e.message}`)
      throw e
    }
  }
}

module.exports = getPilotData
