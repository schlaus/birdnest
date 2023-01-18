const logger = require('./logger')
const { sleep } = require('./utils')


/**
 * Fired when the maximum amount of successive fails has been reached.
 */
exports.MaxFailsReached = class MaxFailsReached extends Error {
  constructor(maxFails, e) {
    super(`Maximum number of fails (${maxFails}) reached`)
    this.name = this.constructor.name
    this.originalError = e
  }
}

/**
 * Options for withExpBackoff
 * @typedef {Object} withExpBackoff~Options
 * @property {number} [initialDelay=500] - How much should a request be delayed if the previous request failed (in milliseconds).
 * @property {number} [increaseFactor=1.5] - Used as the base of the exponential backoff algorithm.
 * @property {number} [decreaseFactor=1.25] - Used as the divisor when reducing delay.
 * @property {number} [decreaseThreshold=10] - How many successful requests are needed before reducing delay.
 * @property {number} [maxDelay=0] - Maximum allowed delay (in milliseconds). Once this limit is reached the delay is no longer increased. 0 means no maximum.
 * @property {number} [maxFails=0] - Maximum numbed of successive failed requests before a MaxFailsReached error is fired.
 */

/**
 * Wraps a function to use an exponential backoff algorithm. If the execution of
 * the wrapped function results in an error being thrown, the next executions of
 * the function will be delayed. The length of the delay is calculated as
 * initialDelay * increaseFactor^successiveFailedAttempts. Once a number 
 * (defined by decreaseThreshold) of executions have succeeded, the delay is
 * reduced. The new delay is calculated as currentDelay / decreaseFactor.
 * @param {function} fn 
 * @param {withExpBackoff~Options} options
 * @returns {function} The wrapped function.
 */
exports.withExpBackoff = function withExpBackoff(fn, {
  initialDelay = 500,
  increaseFactor = 1.5,
  decreaseFactor = 1.25,
  decreaseThreshold = 10,
  maxDelay = 0,
  maxFails = 0
} = {}) {
  let successes = 0
  let fails = 0
  let currentDelay = 0

  const run = async (...args) => {
    logger.debug(`Running fn ${fn.name} with exponential backoff with ${currentDelay} ms delay. Success: ${successes}; fail: ${fails}`)
    if (currentDelay) {
      await sleep(currentDelay)
    }

    try {
      logger.debug('Running backed off fn')
      const resp = await fn(...args)
      fails = 0
      successes += 1
      if (decreaseThreshold && successes >= decreaseThreshold && currentDelay > initialDelay) {
        currentDelay = Math.round(currentDelay / decreaseFactor)
        successes = 0
      }
      logger.debug(`Running ${fn.name} succeeded. Success: ${successes}; fail: ${fails}; currentDelay: ${currentDelay}`)
      return resp
    } catch (e) {
      successes = 0
      fails += 1
      if (maxFails && fails >= maxFails) {
        logger.info(`Max fails (${maxFails}) reached for ${fn.name}`)
        throw new MaxFailsReached(maxFails, e)
      }
      currentDelay = initialDelay * increaseFactor ** fails
      if (maxDelay) {
        currentDelay = Math.min(maxDelay, currentDelay)
      }
      logger.debug(`Running ${fn.name} failed. Success: ${successes}; fail: ${fails}; currentDelay: ${currentDelay}`)
      logger.debug(e)
      throw e
    }
  }

  return run
}
