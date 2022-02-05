const { MONGODB_URI } = process.env;

const MongoClient = require("mongodb").MongoClient;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
}
const connect = (callback) => {
  const mongoClient = new MongoClient(MONGODB_URI, options);

  mongoClient.connect(async (err, client) => {

  if(err){
    console.log(err);
  }

  await callback(client);
  setTimeout(() => client.close());
})}

module.exports = {
  connect
}