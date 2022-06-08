const { connect } = require('./mongoConnector');

class Logger {
  static sendUserTextMessage(user = {}, channelName, message, botToSend){
    let sendMessage = message + "\n";
    sendMessage += `Пользователь: <@${user.id}>\n`;
    sendMessage += "Имя: *" + user.real_name + "*\n";
    sendMessage += "Из группы: *" + channelName + "*\n";
    this.sendMessage(sendMessage, botToSend);
  }

  static sendMessage(message, botToSend){
    connect(async (client) => {
      const db = client.db("schedule");
      const hooksCollection = db.collection("hooks");
      const hook = await hooksCollection.findOne({channel: "sheduler-center"});
      if(hook && botToSend) {
        const channel = botToSend.channels.cache.get(hook.channelId);
        channel.send(message);
      }
    });
  }
}

module.exports = Logger;