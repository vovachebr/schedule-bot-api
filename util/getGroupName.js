const { SLACK_BOT_TOKEN } = process.env;
const httpRequest = require('request');

const getGroupName = (channel, callback) => {
  options = {
    uri: `https://slack.com/api/conversations.info?token=${SLACK_BOT_TOKEN}&channel=${channel}`,
    method: 'POST'
  }

  httpRequest(options, (error, res) => {
    const info = JSON.parse(res.body);
    callback(info.channel && info.channel.name || "проблема в получении названии канала");
  });
};

module.exports = {
  getGroupName
}