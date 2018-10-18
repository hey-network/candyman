const {
  createLogger,
  format,
  transports,
} = require('winston');

const {
  combine,
  timestamp,
  label,
  printf,
} = format;

const customFormat = combine(
  label({ label: 'CANDYMAN' }),
  timestamp(),
  printf(info => `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`),
);

const logger = createLogger({
  level: 'debug',
  format: customFormat,
  transports: [
    new transports.Console({ format: customFormat }),
  ],
});

module.exports = {
  logger,
};
