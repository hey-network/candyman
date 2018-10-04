import {
  createLogger,
  format,
  transports
} from 'winston';

const {
  combine,
  timestamp,
  label,
  printf,
  colorize
} = format;

const fileFormat = combine(
  label({ label: 'CANDYMAN' }),
  timestamp(),
  printf(info => `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`)
);

const consoleFormat = combine(
  colorize(),
  label({ label: 'CANDYMAN' }),
  timestamp(),
  printf(info => `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`)
);

const logger = createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/combined.log' })
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: consoleFormat
  }));
}

export default logger;
