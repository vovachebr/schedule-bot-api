const { LOGGER_CHAT_ID } = process.env;
const bot = require('../telegramBot');

class Logger {
  static sendUserTextMessage(user, message){
    let sendMessage = message + "\n";
    sendMessage += "Имя: *" + user.real_name + "*\n";
    sendMessage += "Отображаемое имя: *" + user.profile.display_name + "*\n";
    sendMessage += "Аватар: " + (user.profile.image_192 || "").replace(/_/g, `\\_`) + "\n";
    bot.sendMessage(LOGGER_CHAT_ID, sendMessage, {parse_mode: 'Markdown'});
  }

  static sendMessage(message){
    bot.sendMessage(LOGGER_CHAT_ID, message, {parse_mode: 'Markdown'});
  }
}

module.exports = Logger;