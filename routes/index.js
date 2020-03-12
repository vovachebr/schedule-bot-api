const { MONGODB_URI } = process.env;

const router = require('express').Router();
const request = require('request');
const schedule = require('node-schedule');
const MongoClient = require("mongodb").MongoClient;
const bot = require('../telegramBot');

const hooks = require('./hooks');
const lessons = require('./lessons');

router.use('/hooks', hooks);
router.use('/lessons', lessons);

const j = schedule.scheduleJob('00 00 14 * * *', function(){
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
      
        if(err) return console.log("err:",err);

        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");
        const hooksCollection = db.collection("hooks");
     
        const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

        
        lessonsCollection.find({date:today, isSent: false}).toArray(function(errLesson, lessons = []){

            lessons.forEach(lesson => {
                hooksCollection.findOne({group: lesson.group}, function(errHook, hook){
                    sendLessonNotification(lesson, hook)
                })
            })
            lessonsCollection.findOneAndUpdate({date:today}, {$set: {isSent: true}});
            client.close();
        });
    });
});

router.post("/sendInstantMessage", function(request, response) {
    const {channel, text} = request.body;
    const configer = {
        slack: sendSlackMessage,
        telegram: sendTelegramMessage
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

function sendSlackMessage(hook, data){
    const uri = hook.value;
    let sendData = data;
    if (typeof data === "string"){
        sendData = [
            {
                "type": "section",
                text:{
                    "type": "mrkdwn",
                    text: data
                }
            }
        ]; 
    }
        
    options = {
        uri,
        method: 'POST',
        json: {
            blocks: sendData
        }
    }
    request(options, function (error, response, body) {
        //TODO: удалить это позже (используется для отладки HTTP запросов в слак)
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
      });
}

function sendTelegramMessage(hook, message){
    const { channelId } = hook;
    bot.sendMessage(channelId, message);
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
    sendSlackMessage(hook, data);
}

function getLessonText(lesson){
    let template = "<!channel> \n Добрый день! \n Сегодня, {date}, в {time} по московскому времени состоится лекция «{lecture}». Ее проведет {teacher}. {additional} \n\n Ссылку на трансляцию вы найдете в личном кабинете и в письме, которое сегодня придет вам на почту за два часа до лекции.";
    options = {
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
    splittedData[0] = getMounth(+splittedData[0] - 1);
    splittedData[1] = +splittedData[1];
    template = template.replace("{date}", splittedData.reverse().join(' '));
    template = template.replace("{time}", lesson.time);
    template = template.replace("{teacher}", lesson.teacher);
    template = template.replace("{lecture}", lesson.lecture);
    template = template.replace("{additional}", lesson.additional || "");
    return template;
}

module.exports = router;