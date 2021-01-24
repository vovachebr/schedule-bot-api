const { connect } = require('./mongoConnector');
const request = require('request');

class Logger {
  static sendUserTextMessage(user = { profile: {}}, channelName, message){
    let sendMessage = message + "\n";
    sendMessage += `Пользователь: <@${user.id}>\n`;
    sendMessage += "Имя: *" + user.real_name + "*\n";
    sendMessage += "Отображаемое имя: *" + user.profile.display_name + "*\n";
    sendMessage += "Из группы: *" + channelName + "*\n";
    this.sendMessage(sendMessage);
  }

  static sendMessage(message){
    const sendData = {
      blocks: [
      {
        "type": "section",
        text:{
          "type": "mrkdwn",
          text: message
        }
      }
    ]};
    
    connect(async (client) => {
      const db = client.db("schedule");
      const hooksCollection = db.collection("hooks");
      const hook = await hooksCollection.findOne({channel: "secret"});
      options = { uri: hook.value, method: 'POST', json: sendData}

      request(options);
    });
  }
}

module.exports = Logger;