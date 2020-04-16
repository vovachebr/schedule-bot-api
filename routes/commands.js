const { MONGODB_URI, SLACK_BOT_TOKEN } = process.env;

const router = require('express').Router();
const httpRequest = require('request');
const MongoClient = require("mongodb").MongoClient;

router.post("/addme", function(request, response){
    const channelName = request.body.text.toLowerCase();
    const userId = request.body.user_id;
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 
        
        hooksCollection.findOne({channel: channelName}).then(function(hook){
            if(!hook){
                client.close();
                response.json({
                    response_type: "ephemeral",
                    text: "Канал не найден. Обратитесь к координатору курса за помощью."
                });
                return;
            }

            options = {
                uri: `https://slack.com/api/conversations.invite?token=${SLACK_BOT_TOKEN}&channel=${hook.channelId}&users=${userId}`,
                method: 'POST'
            }
            
            httpRequest(options, function (error, res, body) {
                response.json({ blocks: [
                    {
                        "type": "section",
                        text:{
                            "type": "mrkdwn",
                            text: `Вы добавлены в канал ${channelName}`
                        }
                    }
                ]});
            });
            client.close();
        });
    });
});

router.post("/moveme", function(request, response){
    const channelName = request.body.text.toLowerCase();
    const userId = request.body.user_id;
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 
        
        hooksCollection.findOne({channel: channelName}).then(function(hook){
            if(!hook){
                client.close();
                response.json({
                    response_type: "ephemeral",
                    text: "Канал не найден. Обратитесь к координатору курса за помощью."
                });
                return;
            }

            options = {
                uri: `https://slack.com/api/conversations.invite?token=${SLACK_BOT_TOKEN}&channel=${hook.channelId}&users=${userId}`,
                method: 'POST'
            }
            
            httpRequest(options, function (error, res, body) {
                options.uri = options.uri.replace("invite", "kick");
                options.uri = options.uri.replace("users", "user");
                options.uri = options.uri.replace(hook.channelId, request.body.channel_id);
                httpRequest(options);
            });
            client.close();
        });
    });
});

module.exports = router;