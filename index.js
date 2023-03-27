require('dotenv').config();
const { PORT, DISCORD_BOT_TOKEN } = process.env;
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const api = require('./routes').router;
const telegammBot = require('./telegramBot');
const discordBot = require('./discordBot');
const CronJob = require('cron').CronJob;
const schedule = require('./schedule');
const job = new CronJob(
  '0 0 10 * * *',
  function() {
    schedule.scheduler();
    schedule.startTemplates();
  }
);
job.start();

discordBot.login(DISCORD_BOT_TOKEN);
const app = express();
app.use(morgan('tiny'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', api);

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, function(request, response){
  telegammBot.processUpdate(request.body);
});

app.use(express.static(__dirname));

app.get("/*", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));