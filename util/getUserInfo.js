const { SLACK_BOT_TOKEN } = process.env;
const httpRequest = require('request');

const getUserInfo = (userId, callback) => {
  options = {
    uri: `https://slack.com/api/users.info?token=${SLACK_BOT_TOKEN}&user=${userId}`,
    method: 'POST'
  }

  httpRequest(options, (error, res) => {
    callback(JSON.parse(res.body));
  });
};

module.exports = {
  getUserInfo
}