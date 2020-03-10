const { MONGODB_URI } = process.env;

const router = require('express').Router();
const request = require('request');
const schedule = require('node-schedule');
const MongoClient = require("mongodb").MongoClient;

const hooks = require('./hooks');
const lessons = require('./lessons');

router.use('/hooks', hooks);
router.use('/lessons', lessons);

const j = schedule.scheduleJob('0 10 10 * * *', function(){
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
      
        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");
        const hooksCollection = db.collection("hooks");
     
        const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

        if(err) return console.log(err);
        
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
    const {hook, text} = request.body;
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
    response.json({ success: true});
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
    splittedData[0] = +splittedData[0];
    template = template.replace("{date}", splittedData.join(' '));
    template = template.replace("{time}", lesson.time);
    template = template.replace("{teacher}", lesson.teacher);
    template = template.replace("{lecture}", lesson.lecture);
    template = template.replace("{additional}", lesson.additional || "");
    return template;
}
/**
 * "0" :{
        "group":"unknown",
        "date": "2020-02-09",
        "time": "18:30",
        "teacher": "Владимир Чебукин",
        "lecture": "Стандарты и Рабочее окружение",
        "additional": "На занятии вы узнаете: \n- про рабочее окружение;\n- про менеджер пакетов для JS;\n- как установить live-server;\n- а также про ESLint.",
        "imageUrl": "https://medialeaks.ru/wp-content/uploads/2017/10/catbread-01.jpg"
    }
 */

module.exports = router;