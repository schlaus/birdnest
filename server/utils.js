/**
 * @typedef {Object} DroneDataset
 * @property {string} serialNumber
 * @property {string} [model]
 * @property {string} [manufacturer]
 * @property {string} [mac]
 * @property {string} [ipv4]
 * @property {string} [ipv6]
 * @property {string} [firmware]
 * @property {number} [altitude]
 * @property {number} closestDistance
 * @property {number} positionX
 * @property {number} positionY
 * @property {Date} lastSeen
 * @property {Object} [pilot]
 * @property {string} [pilot.name]
 * @property {string} [pilot.email]
 * @property {string} [pilot.phoneNumber]
 * @property {positionTupleCollection} [positions]
 */


/**
 * Calculates a drone's distance to the nest.
 * @param {Object} drone - Drone data.
 * @returns {number} The distance in millimeters.
 */
function distanceToNest(drone) {
  const distance = Math.sqrt(
    (drone.positionY - 250000) ** 2 + (drone.positionX - 250000) ** 2
  )
  return distance
}

/**
 * Creates a drone dataset from data received from the drone API.
 * @param {Object} drone - Drone data.
 * @param {Date} timestamp - Timestamp received from the API.
 * @returns {DroneDataset}
 */
function createDroneDataset(drone, timestamp) {
  return {
    ...drone,
    lastSeen: new Date(timestamp.getTime()),
    closestDistance: distanceToNest(drone),

    positions: {
      [timestamp.getTime()]: [drone.positionX, drone.positionY]
    },
  }
}

/**
 * Clone an object except for specified properties.
 * @param {Object} o - The object to copy.
 * @param {...any} props - Properties to omit.
 * @returns {Object}
 */
function omit(o, ...props) {
  const c = structuredClone(o)
  for (const prop of props) {
    delete c[prop]
  }
  return c
}

/**
 * Clone an object with only specified properties.
 * @param {Object} o - The object to copy.
 * @param {...any} props - Properties to pick.
 * @returns {Object}
 */
function pick(o, ...props) {
  return Object.fromEntries(
    props.filter(prop => prop in o)
      .map(prop => [prop, o[prop]])
  )
}

/**
 * Asynchronously sleep for a given duration. Supports async/await.
 * @param {number} ms - How many milliseconds to sleep.
 * @param {boolean} [keepAlive=false] - Should the Node process be kept alive.
 * @returns {number} Timeout ID to be used with clearTimeout()
 */
function sleep(ms, keepAlive = false) {
  return new Promise(resolve => {
    const timeoutID = setTimeout(resolve, ms)
    if (keepAlive) timeoutID.unref()
    return timeoutID
  })
}

module.exports = { distanceToNest, createDroneDataset, omit, sleep }
