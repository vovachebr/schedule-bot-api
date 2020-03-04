require('dotenv').config();
const { PORT } = process.env;
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const api = require('./routes');

const app = express();
/*app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['authorized', 'login']
}))*/
app.use(morgan('tiny'));

app.use(bodyParser.json());
app.use('/', api);
app.use(morgan('tiny'));

app.get('*', function (request, response) {
  response.send("Get route");
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));