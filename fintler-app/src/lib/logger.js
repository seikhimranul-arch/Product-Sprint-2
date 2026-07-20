const isDev = import.meta.env.DEV || false;

/* eslint-disable no-console */
export const logger = {
  debug: (message, data) => { if (isDev) console.debug(message, data); },
  error: (message, data) => { console.error(message, data); },
  warn: (message, data) => { console.warn(message, data); },
  info: (message, data) => { if (isDev) console.info(message, data); },
};
/* eslint-enable no-console */

export default logger;
