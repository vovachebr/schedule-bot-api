
const router = require('express').Router();
const uuid = require('node-uuid');

const schedule = require('../schedule');
const { connect } = require('./../util/mongoConnector');

router.get("/start", (require, response) => {
    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

    const configer = {
        slack: schedule.sendSlackMessage,
        telegram: schedule.sendTelegramMessage
    };

    connect(async (client) => {
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");
        const hooksCollection = db.collection("hooks");

        const todayTemplates = await templatesCollection.find({"schedule.date": today}).toArray() || [];

        for (let i = 0; i < todayTemplates.length; i++) {
            const template = todayTemplates[i];
            const hook = await hooksCollection.findOne({channel: template.schedule.channel});
            const sender = configer[hook.messegerType];
            sender(hook, template.value);
            await templatesCollection.findOneAndUpdate({id: template.id}, {$unset: {schedule:""}})
        }
        response.json({ success: true});
    });
});

router.get("/:id?", (request, response) => {
    let id = request.query.id; 
    connect(async (client) => {
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        if(id){
            const template = await templatesCollection.findOne({id})
            response.json({ success: true, template});
        }else{
            const templates = await templatesCollection.find({}).toArray();
            response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
        }
    });
});

router.post("/remove", (request, response) => {
    let { id } = request.body;
    if(!id){
        response.json({ success: false, error: "id отсутствует"});
        return;
    }

    connect(async (client) => {
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        await templatesCollection.remove({id});
        const templates = await templatesCollection.find({}).toArray();
        response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
    });
});

router.post("/update", (request, response) => {
    let { id, title, value, schedule } = request.body;

    if(!title){
        response.json({ success: false, error: "Название шаблона отсутствует"});
        return;
    }

    if(schedule && (!schedule.date || !schedule.channel)){
        response.json({ success: false, error: "Данные для расписания не заполнены полностью"});
        return;
    }
    
    connect(async (client) => {
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        const foundtemplate = await templatesCollection.findOne({title});
        if(foundtemplate && id !== foundtemplate.id){
            response.json({ success: false, error: "Такой шаблон уже существует"});
            return
        }

        if(id){
            await templatesCollection.findOneAndUpdate({id}, {$set: {title, value, schedule}});
        }
        else{
            await templatesCollection.insertOne({ title, value, schedule, id: uuid.v1()});
        }

        const templates = await templatesCollection.find({}).toArray();
        response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
    });
});

module.exports = router;