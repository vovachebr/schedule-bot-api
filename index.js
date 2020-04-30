require('dotenv').config();
const { PORT } = process.env;
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const api = require('./routes').router;
const bot = require('./telegramBot');

const app = express();
app.use(morgan('tiny'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', api);

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, function(request, response){
  bot.processUpdate(request.body);
});

app.use(express.static(__dirname));

app.get("/*", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));