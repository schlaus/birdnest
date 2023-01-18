const EventEmitter = require('events')

const logger = require('./logger')
const Storage = require('./storage')

const getDroneData = require('./drones-api')
const getPilotData = require('./pilots-api')
const { createDroneDataset, omit, pick } = require('./utils')


/**
 * Options for DataManager.
 * @typedef {Object} DataManager~Options
 * @property {boolean} keepAlive - Should DataManager keep the Node process alive.
 * @property {number} pollInterval - Polling interval for drone data.
 */


/** @typedef {Object.<string, DataManager~DroneDataset>} DroneDatasetCollection */

/** @typedef {[number, number]} positionTuple */

/** @typedef {Object.<number, positionTuple>} positionTupleCollection */

/**
 * DataManager orchestrates API requests and manages data access and updates.
 * @extends EventEmitter
 */
class DataManager extends EventEmitter {

  #storage
  #tickTimeout
  #options = {}
  #active = false
  #refreshCycles = 0
  #cycleLoggerTimeout

  /**
   * @returns {DataManager~Options} A copy of the current options.
   * @see DataManager~Options
   */
  get options() {
    return structuredClone(this.#options)
  }

  /**
   * @returns {boolean} Whether DataManager is currently active.
   */
  get active() {
    return this.#active
  }

  /**
   * Returns a dictionary of currently stored drone data, keyed by serial
   * number.
   * @returns {Object.<string, import('./utils').DroneDataset>}
   */
  getCurrentData() {
    return this.#storage.getAll()
  }


  /**
   * Emits a drone's data. If a timestamp is provided, position data for the
   * specified time will also be included in the positions property.
   * @private
   * @fires DataManager#data
   * @param {string} serialNumber 
   * @param {Date} [timestamp]
   */
  #broadcastUpdate(serialNumber, timestamp) {
    /**
     * Drone data event.
     * @event DataManager#data
     * @param {string} serialNumber
     * @param {import('./utils').DroneDataset} [data] - A null value indicates the data has expired.
     */
    logger.debug(`Broadcasting update for drone ${serialNumber}, timestamp: ${timestamp}`)
    const drone = this.#storage.get(serialNumber)
    if (drone) {
      const data = omit(drone, 'positions')
      /*
      const data = {
          serialNumber,
          closestDistance: drone.closestDistance,
          pilot: drone.pilot,
          positionX: drone.positionX,
          positionY: drone.positionY,
          lastSeen: drone.lastSeen
      }
      */
      if (timestamp) {
        data.positions = { [timestamp.getTime()]: drone.positions[timestamp.getTime()] }
      }
      this.emit('data', serialNumber, data)
    } else {
      this.emit('data', serialNumber, null)
    }
  }

  /**
   * Starts polling the APIs for new data.
   * @param {DataManager~Options} [options]
   */
  start({ keepAlive = true, pollInterval = 2000 } = {}) {
    logger.debug(`Data manager starting`)
    if (this.#tickTimeout) {
      logger.info(`DataManager.start() called while already running`)
      return
    }
    this.#options = { keepAlive, pollInterval }
    this.#storage = new Storage()

    this.#active = true
    this.#run()

    const cycleLoggerData = {
      prevCount: 0,
      prevTime: Date.now()
    }

    this.#cycleLoggerTimeout = setInterval(() => {
      const now = Date.now()
      const timeDiff = now - cycleLoggerData.prevTime
      logger.debug(`Completed ${this.#refreshCycles - cycleLoggerData.prevCount} refresh cycles in the last ${timeDiff} ms`)
      cycleLoggerData.prevCount = this.#refreshCycles
      cycleLoggerData.prevTime = now
    }, 60000)
  }

  /**
   * Stops DataManager and drops currently stored data.
   */
  stop() {
    logger.debug(`Data manager stopping`)
    clearTimeout(this.#tickTimeout)
    clearInterval(this.#cycleLoggerTimeout)
    this.#storage.drop()
  }

  /**
   * Clears expired data from storage.
   */
  purgeExpiredViolations() {
    const now = new Date()
    const tenMinutesInMs = 10 * 60 * 1000
    const isExpired = (_, drone) => now - drone.lastSeen >= tenMinutesInMs

    const expired = Object.keys(this.#storage.find(isExpired))
    logger.debug(`Found ${expired.length} expired violations`)

    for (const serialNumber of expired) {
      this.#storage.delete(serialNumber)
      this.#broadcastUpdate(serialNumber)
    }
  }

  /**
   * Trims position data so that only the last { env.MAX_POSITIONS }
   * positions are kept.
   */
  trimPositionData() {
    const maxPositions = parseInt(process.env.MAX_POSITIONS)
    this.#storage.forEach((serialNumber, drone) => {
      const { positions } = drone
      const positionKeys = Object.keys(positions).map(key => parseInt(key))
      if (positionKeys.length >= maxPositions) {
        positionKeys.sort().reverse()
        positionKeys.length = maxPositions
        this.#storage.update(serialNumber, 'positions', pick(positions, ...positionKeys))
      }
    })
  }

  /**
   * Updates pilot information for drones whose pilots have not been 
   * identified yet. Known data is never updated as pilot information never 
   * changes per spec.
   */
  async updatePilotData() {

    const noPilotInfo = (_, drone) => !drone.pilot

    logger.debug(`Updating missing pilot data`)
    this.#storage.where(noPilotInfo, async (serialNumber, drone) => {
      logger.debug(`Fetching pilot information for drone ${serialNumber}, current info:`, drone.pilot)
      const pilot = await getPilotData(drone)
      if (pilot) {
        logger.debug(`Fetched pilot information for drone ${serialNumber}`, pilot)

        // Check for the existence first because there's a chance
        // the violation expired before pilot query succeeded.
        if (this.#storage.has(serialNumber)) {
          logger.debug(`Saving pilot information for drone ${serialNumber}`)
          this.#storage.set(serialNumber, "pilot", pilot)
          this.#broadcastUpdate(serialNumber)
        } else {
          logger.debug(`Did not save pilot information for drone ${serialNumber} as drone was not found in storage`)
        }
      } else {
        logger.debug(`Fetching pilot information for drone ${serialNumber} failed`)
      }
    })
  }

  /**
   * Updates drone data from the drone API.
   */
  async updateDroneData() {
    logger.silly(`Getting new drone report`)
    const report = await getDroneData()
    if (!report) {
      logger.debug('Received empty drone report')
      return
    }
    const { drones, timestamp } = report
    logger.silly(`Report contains ${drones.length} drones`)
    logger.silly('Full report:', drones)

    for (const drone of drones) {
      const newData = createDroneDataset(drone, timestamp)
      const oldData = this.#storage.get(drone.serialNumber)
      const droneInNDZ = newData.closestDistance <= 100000
      const keepData = oldData || droneInNDZ

      logger.silly(`Drone ${drone.serialNumber}`, { exists: !!oldData, droneInNDZ, keepData })

      if (!keepData) continue

      if (oldData) {
        newData.closestDistance = Math.min(
          newData.closestDistance, oldData.closestDistance
        )
      }

      this.#storage.upsert(drone.serialNumber, newData)
      this.#broadcastUpdate(drone.serialNumber, timestamp)
    }
  }

  /**
   * Triggers a refresh cycle and schedules the next run.
   */
  async #run() {
    logger.silly('Data manager run started')
    const start = Date.now()
    await this.refresh()
    const end = Date.now()
    logger.silly(`Refresh cycle took ${end - start} ms`)
    this.#refreshCycles += 1
    this.#tickTimeout = setTimeout(() => {
      this.#run()
    }, this.#options.pollInterval)
  }

  /**
   * Does a full data refresh cycle.
   * @see purgeExpiredViolations
   * @see updateDroneData
   * @see updatePilotData
   */
  async refresh() {
    this.purgeExpiredViolations()
    await this.updateDroneData()
    this.trimPositionData()
    await this.updatePilotData()
  }
}

module.exports = new DataManager()
