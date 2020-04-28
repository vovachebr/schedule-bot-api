const { MONGODB_URI } = process.env;

const router = require('express').Router();
const MongoClient = require("mongodb").MongoClient;
const schedule = require('../schedule');

const hooks = require('./hooks');
const lessons = require('./lessons');
const commands = require('./commands');
const templates = require('./templates');

router.use('/hooks', hooks);
router.use('/lessons', lessons);
router.use('/commands', commands);
router.use('/templates', templates);

router.get("/start", function(request, response) {
    schedule.scheduler();
    response.send("Запрос отправлен в обработку");
})

router.post("/sendInstantMessage", function(request, response) {
    const {channel, text} = request.body;
    const configer = {
        slack: schedule.sendSlackMessage,
        telegram: schedule.sendTelegramMessage
    };

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");
     
        hooksCollection.find({channel}).toArray(function(errHook, hooks = []){
            for (let i = 0; i < hooks.length; i++) {
                const hook = hooks[i];
                const sender = configer[hook.messegerType];
                sender(hook, text);
            }
            response.json({ success: true});
            client.close();
        })
    });
});

router.get("/getDatabaseStat", async function(request, response) {
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await mongoClient.connect();
 
    const stats = await client.db('schedule').stats();
    const busySize = stats.indexSize + stats.dataSize; //bytes
    const allSize = 512 * 1024 * 1024; //bytes;

    response.json({ success: true, busySize, allSize});
});

module.exports = {router};