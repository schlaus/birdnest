const merge = require('deepmerge')

const logger = require('./logger')


/**
 * A utility class for storing data in memory.
 */
class Storage {

  #data

  constructor() {
    this.#init()
  }

  #init() {
    this.#data = {}
    logger.debug('Storage initialized')
  }

  insert(id, data) {
    this.#data[id] = structuredClone(data)
    logger.silly(`Inserted data with id ${id}`, data)
  }

  delete(id) {
    delete this.#data[id]
    logger.silly(`Deleted data with id ${id}`)
  }

  has(id) {
    return !!this.#data[id]
  }

  get(id) {
    return structuredClone(this.#data[id])
  }

  getAll() {
    return structuredClone(this.#data) || {}
  }

  getCount() {
    return Object.keys(this.#data).length
  }

  set(id, key, value) {
    this.#data[id][key] = value
    logger.silly(`Updated key ${key} for id ${id}`, value)
  }

  /**
   * Returns a dictionary with all entries that the supplied callback fn
   * returns a truthy value for.
   * @param {filterFunction} fn 
   * @returns {Object}
   */
  /** @callback filterFunction */
  find(fn) {
    const found = {}
    this.where(fn, (id, data) => {
      found[id] = data
    })
    return found
  }

  drop() {
    this.#init()
    logger.debug(`Storage dropped`)
  }

  update(id, keyOrObject, value) {
    if (typeof keyOrObject === "object") {
      logger.silly(`Merging id ${id} with new data`, keyOrObject)
      this.#data[id] = merge(this.#data[id], keyOrObject)
    } else {
      logger.silly(`Setting key ${keyOrObject} for id ${id}`, value)
      this.#data[id][keyOrObject] = value
    }
  }

  upsert(id, data) {
    if (!this.has(id)) {
      logger.silly(`Upserting id ${id}, using insert`)
      this.insert(id, data)
    } else {
      logger.silly(`Upserting id ${id}, using update`)
      this.update(id, data)
    }
  }

  forEach(func) {
    for (const [id, data] of Object.entries(this.#data)) {
      func(id, structuredClone(data))
    }
  }

  where(predicate, func) {
    for (const [id, data] of Object.entries(this.#data)) {
      if (predicate(id, structuredClone(data))) {
        func(id, structuredClone(data))
      }
    }
  }
}

module.exports = Storage
