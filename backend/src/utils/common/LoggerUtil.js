class LoggerUtil {
  static info(message, meta = null) {
    this.#write('INFO', message, meta);
  }

  static warn(message, meta = null) {
    this.#write('WARN', message, meta);
  }

  static error(message, error = null, meta = null) {
    const errorMeta = error ? { name: error.name, message: error.message, ...(meta || {}) } : meta;
    this.#write('ERROR', message, errorMeta);
  }

  static #write(level, message, meta) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta ? { meta } : {}),
    };
    const line = JSON.stringify(payload);
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
  }
}

module.exports = LoggerUtil;
