require('dotenv').config();
const { PORT } = process.env;
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const api = require('./routes');
const bot = require('./telegramBot');

const app = express();
/*app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['authorized', 'login']
}))*/
app.use(morgan('tiny'));

app.use(bodyParser.json());
app.use('/api', api);
app.use(morgan('tiny'));

app.use(express.static(__dirname));

app.get("/*", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('*', function (request, response) {
  response.send("Get route");
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));