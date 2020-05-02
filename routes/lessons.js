const schedule = require('../schedule');
var uuid = require('node-uuid');
const router = require('express').Router();
const { connect } = require('./../util/mongoConnector');

router.post("/add", (request, response) => {
    let { group, date, time, teacher, lecture, additional, imageUrl } = request.body;

    let error = "";
    for (const prop in request.body) {
        if (request.body.hasOwnProperty(prop)) {
            const element = request.body[prop];
            if(prop === "imageUrl")
                continue;

            if(!element)
                error += `${prop} отсутствует;\n`;
        }
    }
    if(error){
        response.json({ success: false, error});
        return;
    }
    
    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("lessons");

        let lessons = await lessonsCollection.find({group, date, time, teacher, lecture}).toArray();

        if(lessons.length){
            response.json({ success: false, error: "Такое занятие уже существует"});
            return
        }

        await lessonsCollection.insertOne({ group, date, time, teacher, lecture, additional, imageUrl, id: uuid.v1(), isSent: false})
        response.json({ success: true });
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
        const lessonsCollection = db.collection("lessons");

        await lessonsCollection.remove({id});
        const lessons = await lessonsCollection.find({}).toArray();
        response.json({ success: true, lessons: lessons || []});
    });
});

router.post("/update", (request, response) => {
    let { id, group, date, time, teacher, lecture, isSent } = request.body;
    if(!id){
        response.json({ success: false, error: "id отсутствует"});
        return;
    }

    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("lessons");

        await lessonsCollection.findOneAndUpdate({id}, {$set: {group, date, time, teacher, lecture, isSent}});
        const lessons = await lessonsCollection.find({}).toArray();
        response.json({ success: true, lessons: lessons || []});
    });
});

router.get("/getLastLecture:lecture?", (request, response) => {
    const { lecture } = request.query;

    if(!lecture){
        response.json({ success: false, error: "Отсутствует название лекции"});
        return;
    }

    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("lessons");

        const lesson = await lessonsCollection.findOne({lecture});
        response.json({ success: true, lesson});
    });
});

router.get("/:isSent?", (request, response) => {
    const isSent = request.query.isSent === "true";

    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("lessons");

        const lessons = await lessonsCollection.find({isSent}).toArray();
        response.json({ success: true, lessons: lessons || []});
    });
});

router.post("/sendNotification", (request, response) => {
    const { id } = request.body;

    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("lessons");
        const hooksCollection = db.collection("hooks");

        const lesson = await lessonsCollection.findOne({id});
        const hook = await hooksCollection.findOne({group: lesson.group});

        schedule.sendLessonNotification(lesson, hook)
        response.json({ success: true, data:"Уведомление отправлено"});
        lessonsCollection.updateMany({id}, {$set: {isSent: true}});
    });
});

module.exports = router;