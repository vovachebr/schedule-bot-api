const { MONGODB_URI } = process.env;

const router = require('express').Router();
const MongoClient = require("mongodb").MongoClient;
const schedule = require('../schedule');

const hooks = require('./hooks');
const lessons = require('./lessons');

router.use('/hooks', hooks);
router.use('/lessons', lessons);

router.post("/sendInstantMessage", function(request, response) {
    const {channel, text} = request.body;
    const configer = {
        slack: schedule.sendSlackMessage,
        telegram: schedule.sendTelegramMessage
    };

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
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

module.exports = {router};