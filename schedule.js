const request = require('request');
const bot = require('./telegramBot');
const sleep = require('sleep');
const { getEditImage } = require('./util/imageEditor');
const getLessonText = require('./util/lessonFormatter');
const { connect } = require('./util/mongoConnector');

function schedule(){
  connect(async dataBaseClient => {
    const db = dataBaseClient.db("schedule");
    const lessonsCollection = db.collection("lessons");
    const hooksCollection = db.collection("hooks");
   
    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD
    const lessons = await lessonsCollection.find({date:today, isSent: false}).toArray() || [];
    lessons.forEach(async lesson => {
      const hook = await hooksCollection.findOne({group: lesson.group});
      sendLessonNotification(dataBaseClient, lesson, hook || {});
    })
    await lessonsCollection.updateMany({date:today}, {$set: {isSent: true}})
  });
}

function sendLessonNotification(dataBaseClient, lesson, hook){
  if(!hook.messegerType){
    return;
  }

  lesson.date = lesson.date.split('-').reverse().join('.');
  const configuration = {
    slack: (lesson, hook) => {
      let text = "<!channel> \n" + getLessonText(lesson);
      data = [
        {
          "type": "section",
          text:{
            "type": "mrkdwn",
            text
          },
        },{
          "type": "image",
          "image_url": encodeURI(`${process.env.URL}/api/images/getModifiedImage?user=${lesson.teacher}&time=${lesson.time}&date=${lesson.date}&lessonName=${lesson.lecture}`),
          "alt_text": "изображение с анонсом занятия"
        }
      ];

      data = {
        text,
        blocks: data
      }
      sendSlackMessage(hook, data);
    },
    telegram: (lesson, hook) => {
      let text = getLessonText(lesson);
      const actionCallBack = getEditImage(dataBaseClient, image => {
        bot.sendPhoto(hook.channelId, image, {caption: text})
      });
      actionCallBack(lesson.teacher, lesson.lecture, lesson.time, lesson.date);
    }
  }

  configuration[hook.messegerType] && configuration[hook.messegerType](lesson, hook); // Вызов конфигурации
  sleep(5);
}

function test(){
  connect(async dataBaseClient => {
    const db = dataBaseClient.db("schedule");
    const lessonsCollection = db.collection("lessons");
    const hooksCollection = db.collection("hooks");
   
    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD
    const lessons = await lessonsCollection.find({date:today}).toArray() || [];
    lessons.forEach(async lesson => {
      const hook = await hooksCollection.findOne({group: "unknown"});
      sendLessonNotification(dataBaseClient, lesson, hook || {});
    })
  });
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
  request(options, (error, response, body) => {
    console.error('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
  });
}

function sendTelegramMessage(hook, message){
  const { channelId } = hook;
  bot.sendMessage(channelId, message);
}

module.exports = {
  scheduler: schedule, 
  test: test,
  sendSlackMessage, 
  sendTelegramMessage, 
  sendLessonNotification
};