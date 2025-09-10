const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  info(message, meta = {}) {
    console.log(`ℹ️  ${message}`, meta);
  }
  
  error(message, meta = {}) {
    console.error(`❌ ${message}`, meta);
  }
  
  warn(message, meta = {}) {
    console.warn(`⚠️  ${message}`, meta);
  }
  
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 ${message}`, meta);
    }
  }
  
  get stream() {
    return {
      write: (message) => this.info(message.trim())
    };
  }
}

module.exports = new Logger();
