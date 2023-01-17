const { XMLParser } = require("fast-xml-parser")
const axios = require("axios")

const logger = require('./logger')
const { withExpBackoff } = require('./with-exp-backoff')

const getData = withExpBackoff(function getDronesReport() {
  return axios.get(process.env.DRONE_API_URL, { timeout: parseInt(process.env.API_REQUEST_TIMEOUT) })
}, {
  maxDelay: process.env.MAX_BACKOFF_DELAY_MS
})


/**
 * GETs the current list of drones from the monitoring equipment endpoint.
 * @async
 * @returns 
 */
async function getDroneData() {
  try {
    logger.debug('Attempting to get drone data')
    const response = await getData()
    logger.debug(`Response status: ${response.status}`)

    const { data } = response
    const options = {
      ignoreAttributes: false
    }
    const parser = new XMLParser(options)
    logger.silly('Parsing XML data', data)
    const parsedData = parser.parse(data)
    logger.silly('Parsed data', parsedData)
    const timestamp = new Date(parsedData.report.capture["@_snapshotTimestamp"])

    return { drones: parsedData.report.capture.drone, timestamp }
  } catch (e) {
    if (e.response) {
      /*
      if (e.response.status !== 429) {
        logger.error(`Drone api responded with an unexpected status: ${e.response.status}`, e.response)
        throw e
      }
      */
      return null
    } else if (e.request) {
      logger.info(`No response from drone api`)
      return null
    } else {
      logger.error(`Encountered error while setting up request to drone api: ${e.message}`)
      throw e
    }
  }
}

module.exports = getDroneData
