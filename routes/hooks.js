const router = require('express').Router();
const { connect } = require('./../util/mongoConnector');

router.get("/", (request, response) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");
    
    const hooks = await hooksCollection.find({}).toArray();
    response.json({ success: true, hooks: hooks});
  });
});

router.post("/add", (request, response) => {
  let { value, group, channel, channelId } = request.body;
  if(!value || !group || !channel){
    response.json({ success: false, error: "Отсутствуют данные"});
    return;
  }

  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    foundHooks = await hooksCollection.find({$or: [{value},{group},{channel}]}).toArray() || [];
    if(foundHooks.length > 0){
      response.json({ success: false, error: "Хук с такими значениями уже существует"});
      return;
    }

    channel = channel.toLowerCase();
    await hooksCollection.insertOne({ value, group, channel, channelId, messegerType: "slack" });
    foundHooks = await hooksCollection.find({}).toArray();
    response.json({ success: true, hooks: foundHooks});
  });
});

router.post("/remove", (request, response) => {
  let { value, channelId } = request.body;
  if(!channelId){
    response.json({ success: false, error: "channelId отсутствуют"});
    return;
  }

  channelId = isNaN(+channelId) ? channelId : +channelId;

  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    await hooksCollection.findOneAndDelete({value, channelId});
    const foundHooks = await hooksCollection.find({}).toArray();
    response.json({ success: true, hooks: foundHooks});
  });
});

router.post("/update", (request, response) => {
  let { oldValue, oldChannel, value, channel, group, channelId } = request.body;
  if(!(value || channelId)){
    response.json({ success: false, error: "value или channelId отсутствует"});
    return;
  }

  channel = channel.toLowerCase();

  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    await hooksCollection.findOneAndUpdate({value: oldValue,channelId: oldChannel}, {$set: {value, channel, group, channelId}});
    const foundHooks = await hooksCollection.find({}).toArray();
    response.json({ success: true, hooks: foundHooks});
  });
});

module.exports = router;