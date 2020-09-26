const { LOGGER_CHAT_ID } = process.env;
const bot = require('../telegramBot');

class Logger {
  static sendMessage(message){
    bot.sendMessage(LOGGER_CHAT_ID, message, {parse_mode: 'Markdown'});
  }
}

module.exports = Logger;