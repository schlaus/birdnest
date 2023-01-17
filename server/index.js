/**
 * Birdnest server bootstrap.
 */

require('dotenv-extended').load()

const logger = require('./logger')
const server = require('./birdnest-server')


function exitHandler(code, reason) {
  const exit = () => {
    logger.on('finish', () => {
      process.exit(code)
    })

    logger.end()
  }

  return (err, promise) => {
    logger.debug(`Exiting due to ${reason} (code: ${code})`)
    if (err && err instanceof Error) {
      logger.error(err.stack)
      logger.error(promise)
      console.log(err.stack)
      console.log(promise)
    }

    server.stop(exit)
    setTimeout(exit, 500).unref()

  }
}

process.on('uncaughtException', exitHandler(1, 'Unexpected Error'))
process.on('unhandledRejection', exitHandler(1, 'Unhandled Promise'))
process.on('SIGTERM', exitHandler(0, 'SIGTERM'))
process.on('SIGINT', exitHandler(0, 'SIGINT'))

server.start()

