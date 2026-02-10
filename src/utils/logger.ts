import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp }) => {
  return `[${(timestamp as string).slice(11, 19)}] ${level}: ${message}`;
});

const fileFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        colorize(),
        consoleFormat,
      ),
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'swap-bot.log'),
      format: combine(
        timestamp(),
        fileFormat,
      ),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

export const log = {
  info: (msg: string) => logger.info(msg),
  success: (msg: string) => logger.info(`✅ ${msg}`),
  warn: (msg: string) => logger.warn(msg),
  error: (msg: string) => logger.error(msg),
  debug: (msg: string) => logger.debug(msg),
  tx: (hash: string) => logger.info(`🔗 TX: https://bscscan.com/tx/${hash}`),
};
