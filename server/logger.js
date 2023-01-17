/**
 * Logging setup
 */

const winston = require('winston')
const format = winston.format


const fileFormat = format.combine(
  format.timestamp(),
  format.prettyPrint()
)

const consoleFormat = format.combine(
  format.colorize(),
  format.simple(),
  format.printf(info => {
    const { level, ...rest } = info
    let rtn = ""
    rtn += "[" + info.level + "] "
    if (rest.stack) {
      rtn += rest.message.replace(rest.stack.split("\n")[0].substr(7), "")
      rtn += "\n"
      rtn += "[" + level + "] "
      rtn += rest.stack.replace(/\n/g, `\n[${level}]\t`)
    } else {
      rtn += rest.message
    }
    return rtn
  })
)

const errorTransport = new winston.transports.File({
  filename: 'error.log',
  level: 'error',
  format: fileFormat,
})

const fileTransport = new winston.transports.File({
  filename: 'combined.log',
  format: fileFormat
})

const consoleTransport = new winston.transports.Console({
  format: consoleFormat
})

const logger = winston.createLogger({
  transports: [
    errorTransport, fileTransport
  ],
  level: process.env.LOGGING_LEVEL || 'info'
})


if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport)
}


module.exports = logger
