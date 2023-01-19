const EventEmitter = require('events')

const logger = require('./logger')
const Storage = require('./storage')

const getDroneData = require('./drones-api')
const getPilotData = require('./pilots-api')
const { createDroneDataset, omit, pick, sleep } = require('./utils')


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
  #runSequence = 0
  #cycleMonitorTimeout
  #cycleMonitorData = {}
  #runStartedTimestamp

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
    logger.silly(`Broadcasting update for drone ${serialNumber}, timestamp: ${timestamp}`)
    const drone = this.#storage.get(serialNumber)
    if (drone) {
      const data = omit(drone, 'positions')
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
    this.#run(this.#runSequence)

    this.#cycleMonitorData = {
      prevCount: 0,
      prevTime: Date.now(),
      prevRunStart: this.#runStartedTimestamp,
      emptyReports: 0
    }
    const monitorInterval = parseInt(process.env.CYCLE_MONITOR_INTERVAL_MS)

    this.#cycleMonitorTimeout = setInterval(() => {
      const now = Date.now()
      const timeDiff = now - this.#cycleMonitorData.prevTime
      const countDiff = this.#refreshCycles - this.#cycleMonitorData.prevCount
      if (countDiff === 0) {
        logger.error(`No completed cycles in the last ${timeDiff} ms. Storage has ${this.#storage.getCount()} entries.`)
        this.#runSequence++
        this.#run(this.#runSequence)
        logger.debug(`Started new run sequence with id ${this.#runSequence}`)
      } else {
        logger.debug(`Completed ${countDiff} refresh cycles in the last ${timeDiff} ms, latest run timestamp: ${this.#cycleMonitorData.prevRunStart}. Storage has ${this.#storage.getCount()} entries.`)
      }
      this.#cycleMonitorData.prevCount = this.#refreshCycles
      this.#cycleMonitorData.prevTime = now
    }, monitorInterval)
  }

  /**
   * Stops DataManager and drops currently stored data.
   */
  stop() {
    logger.debug(`Data manager stopping`)
    clearTimeout(this.#tickTimeout)
    clearInterval(this.#cycleMonitorTimeout)
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
    logger.silly(`Found ${expired.length} expired violations`)

    for (const serialNumber of expired) {
      this.#storage.delete(serialNumber)
      this.#broadcastUpdate(serialNumber)
    }
  }

  /**
   * Trims a position tuple collection to env.MAX_POSITIONS last entries.
   * @param {positionTupleCollection} positions 
   * @returns 
   */
  #trimPositionObject(positions) {
    const maxPositions = parseInt(process.env.MAX_POSITIONS)
    const positionKeys = Object.keys(positions).map(key => parseInt(key))
    if (positionKeys.length >= maxPositions) {
      positionKeys.sort().reverse()
      positionKeys.length = maxPositions
      return pick(positions, ...positionKeys)
    }
    return positions
  }

  /**
   * Trims position data for all applicable drones so that only the last 
   * env.MAX_POSITIONS positions are kept.
   */
  trimPositionData() {
    const maxPositions = parseInt(process.env.MAX_POSITIONS)
    const tooManyPositions = (_, drone) => Object.keys(drone.positions).length > maxPositions

    this.#storage.where(tooManyPositions, (serialNumber, drone) => {
      logger.silly(`Found drone ${serialNumber} with too many positions: ${Object.keys(drone.positions).length}. Last seen: ${drone.lastSeen}`)
      this.#storage.update(serialNumber, 'positions', this.#trimPositionObject(drone.positions))
    })
  }

  /**
   * Updates pilot information for drones whose pilots have not been 
   * identified yet. Known data is never updated as pilot information never 
   * changes per spec.
   */
  async updatePilotData() {

    const noPilotInfo = (_, drone) => !drone.pilot

    logger.silly(`Updating missing pilot data`)
    this.#storage.where(noPilotInfo, async (serialNumber, drone) => {
      logger.silly(`Fetching pilot information for drone ${serialNumber}`, { pilotData: drone.pilot })
      const pilot = await getPilotData(drone)
      if (pilot) {
        logger.silly(`Fetched pilot information for drone ${serialNumber}`, pilot)

        // Check for the existence first because there's a chance
        // the violation expired before pilot query succeeded.
        if (this.#storage.has(serialNumber)) {
          logger.silly(`Saving pilot information for drone ${serialNumber}`)
          this.#storage.set(serialNumber, "pilot", pilot)
          this.#broadcastUpdate(serialNumber)
        } else {
          logger.debug(`Did not save pilot information for drone ${serialNumber} as drone was not found in storage`)
        }
      } else {
        logger.silly(`Fetching pilot information for drone ${serialNumber} failed`)
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
      this.#cycleMonitorData.emptyReports++
      return
    }
    this.#cycleMonitorData.emptyReports = 0
    const { drones, timestamp } = report
    logger.silly(`Report contains ${drones.length} drones`)
    logger.silly('Full report', { drones })

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
   * Triggers a refresh cycle and schedules the next run, unless a new run
   * sequence has been initiated.
   * @param {number} sequenceId - A run sequence id
   */
  async #run(sequenceId) {
    this.#runStartedTimestamp = Date.now()
    logger.silly(`Data manager run started at ${this.#runStartedTimestamp}`)

    if (this.#cycleMonitorData.emptyReports > 5) {
      logger.warn(`Previous ${this.#cycleMonitorData.emptyReports} drone requests failed. Sleeping 5000 ms before next request.`)
      await sleep(5000, true)
    }

    await this.refresh()
    logger.silly(`Refresh cycle took ${Date.now() - this.#runStartedTimestamp} ms`)
    this.#refreshCycles += 1
    if (this.#runSequence === sequenceId) {
      this.#tickTimeout = setTimeout(() => {
        this.#run(sequenceId)
      }, this.#options.pollInterval)
    } else {
      logger.debug(`Run sequence ${sequenceId} terminating (current sequence: ${this.#runSequence})`)
    }
  }

  /**
   * Does a full data refresh cycle.
   * @see purgeExpiredViolations
   * @see updateDroneData
   * @see updatePilotData
   */
  async refresh() {
    this.purgeExpiredViolations()

    const droneDataTimeout = setTimeout(() => {
      logger.debug(`updateDroneData seems to have stalled`)
    }, 10000)

    await this.updateDroneData()
    clearTimeout(droneDataTimeout)

    this.trimPositionData()

    const pilotDataTimeout = setTimeout(() => {
      logger.debug(`updatePilotData seems to have stalled`)
    }, 10000)
    await this.updatePilotData()
    clearTimeout(pilotDataTimeout)
  }
}

module.exports = new DataManager()
