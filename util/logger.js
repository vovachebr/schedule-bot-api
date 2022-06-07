const { connect } = require('./mongoConnector');
const discordBot = require('../discordBot');


class Logger {
  static sendUserTextMessage(user = {}, channelName, message){
    let sendMessage = message + "\n";
    sendMessage += `Пользователь: <@${user.id}>\n`;
    sendMessage += "Имя: *" + user.real_name + "*\n";
    sendMessage += "Из группы: *" + channelName + "*\n";
    this.sendMessage(sendMessage);
  }

  static sendMessage(message){
    connect(async (client) => {
      const db = client.db("schedule");
      const hooksCollection = db.collection("hooks");
      const hook = await hooksCollection.findOne({channel: "sheduler-center"});
      if(hook) {
        const channel = discordBot.channels.cache.get(hook.channelId);
        channel.send(message);
      }
    });
  }
}

module.exports = Logger;