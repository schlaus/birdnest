const merge = require('deepmerge')

const logger = require('./logger')


/**
 * A utility class for storing data in memory.
 */
class Storage {

  constructor() {
    this.#init()
  }

  #init() {
    this._data = {}
    logger.debug('Storage initialized')
  }

  insert(id, data) {
    this._data[id] = structuredClone(data)
    logger.silly(`Inserted data with id ${id}`, data)
  }

  delete(id) {
    delete this._data[id]
    logger.silly(`Deleted data with id ${id}`)
  }

  has(id) {
    return !!this._data[id]
  }

  get(id) {
    return structuredClone(this._data[id])
  }

  getAll() {
    return structuredClone(this._data) || {}
  }

  set(id, key, value) {
    this._data[id][key] = value
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
      this._data[id] = merge(this._data[id], keyOrObject)
    } else {
      logger.silly(`Setting key ${keyOrObject} for id ${id}`, value)
      this._data[id][keyOrObject] = value
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
    for (const [id, data] of Object.entries(this._data)) {
      func(id, structuredClone(data))
    }
  }

  where(predicate, func) {
    for (const [id, data] of Object.entries(this._data)) {
      if (predicate(id, structuredClone(data))) {
        func(id, structuredClone(data))
      }
    }
  }
}

module.exports = Storage
