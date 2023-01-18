/** @module BirdnestServer
 * 
 * Birdnest server module.
 */

const express = require('express')
const http = require('http')
const path = require('path')
const compression = require('compression')
const { renderPage } = require('vite-plugin-ssr')
const { Server } = require('socket.io')

const logger = require('./logger')
const dataManager = require('./data-manager')


class BirdnestServer {

  /**
   * Starts the birdnest server.
   */
  async start() {
    const isProduction = process.env.NODE_ENV === 'production'
    logger.info(`Initializing Birdnest server`, { isProduction })

    this.app = express()
    this.server = http.createServer(this.app)
    logger.silly('Express server created')

    this.io = new Server(this.server)
    logger.silly('Socket.io server created')

    this.app.use(compression())

    const root = path.dirname(__dirname)

    if (isProduction) {
      const sirv = require('sirv')
      this.app.use(sirv(`${root}/dist/client`))
    } else {
      const vite = require('vite')
      const viteDevMiddleware = (
        await vite.createServer({
          root,
          server: { middlewareMode: true }
        })
      ).middlewares
      this.app.use(viteDevMiddleware)
    }
    logger.silly('Middleware initialized')

    logger.silly('Starting data manager')
    dataManager.start()

    dataManager.on('data', (serialNumber, data) => {
      logger.silly('Received data from data manager, emitting to clients', data)
      this.io.emit('data', serialNumber, data)
    })
    logger.silly('Web sockets coupled to data updates')


    // Routing is delegated to vite-plugin-ssr.
    this.app.get('*', async (req, res, next) => {

      logger.silly(`Request: ${req.originalUrl}`)

      const pageContextInit = {
        urlOriginal: req.originalUrl,
        initialData: { drones: dataManager.getCurrentData() }
      }
      logger.silly('Rendering page with context', pageContextInit)

      const pageContext = await renderPage(pageContextInit)
      const { httpResponse } = pageContext

      if (!httpResponse) return next()

      const { body, statusCode, contentType, earlyHints } = httpResponse

      if (res.writeEarlyHints) res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) })

      res.status(statusCode).type(contentType).send(body)
    })
    logger.silly('Routes defined')

    this.io.on('connection', () => {
      logger.silly('New WebSocket connection')
    })

    const port = parseInt(process.env.PORT) || 3000
    this.server.listen(port, () => {
      logger.info(`Server running at http://localhost:${port}`)
    })

  }


  /**
   * Stops the Birdnest server.
   * @param {serverStoppedCallback} [cb] - Optional callback function.
   */
  /**
   * Called once the server has been stopped.
   * @callback serverStoppedCallback
   */
  stop(cb) {
    if (!this.server) {
      logger.error('Attempted to stop Birdnest server before starting it')
      throw new Error("Can't stop server before starting it.")
    }

    logger.debug('Stopping server')

    dataManager.stop()
    logger.silly('Data manager stopped')

    this.io.close(() => {
      logger.silly('socket.io server stopped')
      logger.info('Birdnest server stopped')
      cb()
    })
  }
}


module.exports = new BirdnestServer()
