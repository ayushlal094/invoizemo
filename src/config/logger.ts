// Simple logger wrapper — compatible with winston-style API
// Keeps console output structured for Render/Railway log viewers

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta }));
  },
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
  },
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'debug', message, ...meta }));
    }
  },
};
