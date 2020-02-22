require('dotenv').config();
const { PORT, PUBLIC_PATH, INDEX_FILE, HOME_FILE } = process.env;
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const api = require('./routes');
/*const cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session')*/

//const low = require('lowdb');
/*const FileSync = require('lowdb/adapters/FileSync', {
    serialize: (data) => encrypt(JSON.stringify(data)),
    deserialize: (data) => JSON.parse(decrypt(data))
  });
const db = low(new FileSync('db.json'));
*/

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