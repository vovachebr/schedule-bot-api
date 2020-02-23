const { CONNECTION_STRING } = process.env;

const router = require('express').Router();
const request = require('request');
const schedule = require('node-schedule');
const MongoClient = require("mongodb").MongoClient;

const hooks = require('./hooks');

router.use('/hooks', hooks);

const mongoClient = new MongoClient(CONNECTION_STRING, { useNewUrlParser: true });

const j = schedule.scheduleJob('0 0 9 * * *', function(){
    mongoClient.connect(function(err, client){
        console.log('Connected to DB!');
      
        const db = client.db("shedule");
        const lessonsCollection = db.collection("lessons");
        const hooksCollection = db.collection("hooks");
     
        const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

        if(err) return console.log(err);
        
        lessonsCollection.find({date:today, isSent: false}).toArray(function(errLesson, lessons){
            console.log(lessons);

            lessons.forEach(lesson => {
                hooksCollection.findOne({channel: lesson.channel}, function(errHook, hook){
                    sendLessonNotification(lesson, hook)
                })
            })
            lessonsCollection.findOneAndUpdate({date:today}, {$set: {isSent: true}});
            client.close();
        });

    });
});

router.post("/sendInstantMessage", function(req, res) {
    const {hook, text} = req.body;
    data = [
        {
            "type": "section",
            text:{
                "type": "mrkdwn",
                text
            }
        }
    ];
    sendMessage(hook, data);
});

function sendMessage(hook, data){
    options = {
        uri: hook,
        method: 'POST',
        json: {
            blocks: data
        }
    }
    request(options);
}

function sendLessonNotification(lesson, hook){
    text = getLessonText(lesson);
    data = [
        {
            "type": "section",
            text:{
                "type": "mrkdwn",
                text
            }
        }
    ];
    if(lesson.imageUrl){
        data.push({
            "type": "image",
            "image_url": lesson.imageUrl,
            "alt_text": lesson.imageUrl
        })
    }
    sendMessage(hook.value, data);
}

function getLessonText(lesson){
    let template = "<!channel> \n Добрый день! \n Сегодня, {date}, в {time} по московскому времени состоится лекция «{lecture}». Ее проведет {teacher}. {additional} \n\n Ссылку на трансляцию вы найдете в личном кабинете и в письме, которое сегодня придет вам на почту за два часа до лекции.";
    options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    };
    let todayDay = new Date().toLocaleString("ru", options);
    const getMounth = (num) => [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря"][num];
    const splittedData = todayDay.split("-");
    splittedData[1] = getMounth(+splittedData[1] - 1);
    template = template.replace("{date}", splittedData.join(' '));
    template = template.replace("{time}", lesson.time);
    template = template.replace("{teacher}", lesson.teacher);
    template = template.replace("{lecture}", lesson.lecture);
    template = template.replace("{additional}", lesson.additional || "");
    return template;
}
/**
 * "0" :{
        "channel":"bjs-test2",
        "date": "2020-02-09",
        "time": "18:30",
        "teacher": "Владимир Чебукин",
        "lecture": "Стандарты и Рабочее окружение",
        "additional": "На занятии вы узнаете: \n- про рабочее окружение;\n- про менеджер пакетов для JS;\n- как установить live-server;\n- а также про ESLint.",
        "imageUrl": "https://medialeaks.ru/wp-content/uploads/2017/10/catbread-01.jpg"
    }
 */

module.exports = router;