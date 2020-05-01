const router = require('express').Router();
const { connect } = require('./../util/mongoConnector');

router.get("/", (request, response) => {
    connect(async (err, client) => {
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 
        
        sendResultCallback = (errHook, hooks) => {
            response.json({ success: true, hooks: hooks});
        }

        foundHooks = await hooksCollection.find();
        foundHooks.toArray(sendResultCallback);
    });
});

router.post("/add", (request, response) => {
    let { value, group, channel, channelId } = request.body;
    if(!value || !group || !channel){
        response.json({ success: false, error: "Отсутствуют данные"});
        return;
    }

    connect(async (err, client) => {
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 

        foundHooksCallback = (errHook, hooks = []) => {
            if(hooks.length > 0){

                response.json({ success: false, error: "Хук с такими значениями уже существует"});
                return;
            }
        
            hooksCollection.insertOne({ value, group, channel, channelId, messegerType: "slack" }, insertHookCallback);
        }

        const insertHookCallback = async (err, result) => {
            if(err){

                response.json({ success: false, error: err});
                return;
            } 

            foundHooks = await hooksCollection.find({}).toArray(sendResultCallback);
        }

        const sendResultCallback = (errHook, hooks) => {
            response.json({ success: true, hooks: hooks});
        }

        foundHooks = await hooksCollection.find({$or: [{value},{group},{channel}]});
        foundHooks.toArray(foundHooksCallback);
    });
});

router.post("/remove", (request, response) => {
    let { value, channelId } = request.body;
    if(!(value || channelId)){
        response.json({ success: false, error: "value отсутствует"});
        return;
    }

    connect(async (err, client) => {
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 

        const sendResultCallback = (errHook, hooks) =>{
            response.json({ success: true, hooks: hooks});
        }

        const deleteHookResponse = await hooksCollection.findOneAndDelete({value, channelId});
        const foundHooks = await hooksCollection.find({});
        foundHooks.toArray(sendResultCallback);
    });
});

router.post("/update", (request, response) => {
    let { oldValue, value, channel, group, channelId } = request.body;
    if(!(oldValue || channelId)){
        response.json({ success: false, error: "value отсутствует"});
        return;
    }

    connect(async (err, client) => {
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 

        const sendResultCallback = (errHook, hooks) =>{
            response.json({ success: true, hooks: hooks});
        }

        await hooksCollection.findOneAndUpdate({value: oldValue, channelId}, {$set: {value, channel, group, channelId}});
        const foundHooks = await hooksCollection.find({});
        foundHooks.toArray(sendResultCallback);
    });
});

module.exports = router;