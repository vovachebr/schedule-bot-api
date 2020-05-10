
const router = require('express').Router();
const uuid = require('node-uuid');

const { connect } = require('./../util/mongoConnector');

router.get("/", (request, response) => {
    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("default_lessons");

        const lessonsArray = await lessonsCollection.find({}).toArray();
        const lessons = {};
        lessonsArray.forEach(element => {
            delete element._id;
            if(!lessons[element.course]){
                lessons[element.course] = [];
            }
            lessons[element.course].push(element);
        });
        response.json({ success: true, lessons });
    });
});

router.post("/remove", (request, response) => {
    let { id } = request.body;
    if(!id){
        response.json({ success: false, error: "id отсутствует" });
        return;
    }

    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("default_lessons");

        await lessonsCollection.remove({id});
        const lessonsArray = await lessonsCollection.find({}).toArray();
        const lessons = {};
        lessonsArray.forEach(element => {
            delete element._id;
            if(!lessons[element.course]){
                lessons[element.course] = [];
            }
            lessons[element.course].push(element);
        });
        response.json({ success: true, lessons });
    });
});

router.post("/create", (request, response) => {
    let { lessonName, teacher, course, additional } = request.body;

    if(!lessonName || !teacher || !course || !additional){
        response.json({ success: false, error: "Не хватает данных для создания" });
        return;
    }
    
    connect(async (client) => {
        const db = client.db("schedule");
        const lessonsCollection = db.collection("default_lessons");

        course = course.toUpperCase();

        const foundtemplate = await lessonsCollection.findOne({lessonName, course});
        if(foundtemplate){
            response.json({ success: false, error: "Такое занятие уже существует" });
            return
        }

        await lessonsCollection.insertOne({ lessonName, teacher, course, additional, id: uuid.v1() });

        const lessonsArray = await lessonsCollection.find({}).toArray();
        const lessons = {};
        lessonsArray.forEach(element => {
            delete element._id;
            if(!lessons[element.course]){
                lessons[element.course] = [];
            }
            lessons[element.course].push(element);
        });
        response.json({ success: true, lessons });
    });
});

module.exports = router;