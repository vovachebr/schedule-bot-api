require('dotenv').config();
const request = require('request');
const MongoClient = require("mongodb").MongoClient;
const bot = require('./telegramBot');

const { MONGODB_URI } = process.env;

schedule();

function schedule(){
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
      
        if(err) return console.log("err:",err);

        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");
        const hooksCollection = db.collection("hooks");
     
        const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

        
        lessonsCollection.find({date:today, isSent: false}).toArray(function(errLesson, lessons = []){

            lessons.forEach(lesson => {
                hooksCollection.findOne({group: lesson.group}, function(errHook, hook = {}){
                    sendLessonNotification(lesson, hook)
                    
                })
            })
            lessonsCollection.updateMany({date:today}, {$set: {isSent: true}}).then(() => client.close())
        })
    });
}

function sendLessonNotification(lesson, hook){
    const configuration = {
        slack: (lesson, hook) => {
            let text = getLessonText(lesson);
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
            data = {
                text,
                blocks: data
            }
            sendSlackMessage(hook, data);
        },
        telegram: (lesson, hook) => {
            let text = getLessonText(lesson);
            text = text.replace("<!channel> \n ", ""); // удаление общей нотификации
            if(lesson.imageUrl){
                bot.sendPhoto(hook.channelId, lesson.imageUrl, {caption: text});
            }else{
                bot.sendMessage(hook.channelId, text);
            }
        }
    }

    configuration[hook.messegerType](lesson, hook); // Вызов конфигурации
}

function getLessonText(lesson){
    let template = "<!channel> \n Добрый день! \n Сегодня, {date}, в {time} по московскому времени состоится лекция «{lecture}». Ее проведет {teacher}. {additional} \n\n Ссылку на трансляцию вы найдете в личном кабинете и в письме, которое сегодня придет вам на почту за два часа до лекции.";
    options = {
        month: 'numeric',
        day: 'numeric'
    };
    let todayDay = new Date().toISOString().slice(5,10);
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

function sendSlackMessage(hook, data){
    const uri = hook.value;
    let sendData = data;
    if (typeof data === "string"){
        sendData = {
            blocks: [
            {
                "type": "section",
                text:{
                    "type": "mrkdwn",
                    text: data
                }
            }
        ]}; 
    }
        
    options = {
        uri,
        method: 'POST',
        json: sendData
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

module.exports = {sendSlackMessage, sendTelegramMessage, sendLessonNotification};