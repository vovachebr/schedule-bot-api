const router = require('express').Router();
const request = require('request');
const schedule = require('node-schedule');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync', {
    serialize: (data) => encrypt(JSON.stringify(data)),
    deserialize: (data) => JSON.parse(decrypt(data))
  });
const db = low(new FileSync('db.json'));

const j = schedule.scheduleJob('* * * * * *', function(){
    sendShedule();
    console.log('The answer to life, the universe, and everything!');
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

function sendShedule(){
    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD
    const hooks = db.get("hooks").value();
    const sheduleDb = db.get("shedule");
    const todayLessons = sheduleDb.filter({date: today}).value();
    todayLessons.forEach(lesson => {
        const hook = hooks.find(h => h.group === lesson.group);
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
        
    });
    sheduleDb.remove({date: today}).write();
    //const otherLessons = allLessons.filter(lesson => lesson.date !== today);
    //db.set("shedule", otherLessons).write();
}

function getLessonText(lesson){
    let template = db.get("messageTemplate").value();
    //let template = "<!channel> \n Добрый день! \n Сегодня, {date}, в {time} по московскому времени состоится лекция «{lecture}». Ее проведет {teacher}. {additional} \n\n Ссылку на трансляцию вы найдете в личном кабинете и в письме, которое сегодня придет вам на почту за два часа до лекции.";
    options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const todayDay = new Date().toLocaleString("ru", options);
    template = template.replace("{date}", todayDay);
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