const request = require('request');
const bot = require('./telegramBot');
const { getEditImage } = require('./util/imageEditor');
const getLessonText = require('./util/lessonFormatter');
const { connect } = require('./util/mongoConnector');
const Logger = require('./util/logger');

const sleep = async () => {
  return await new Promise(resolve => setTimeout(resolve, 10000))//задержка 10сек
}

const formatLessonForLogger = (lessonObject) => {
  let resultMessage = "";
  resultMessage += `Тема занятия: *${lessonObject.lecture}* \n`;
  resultMessage += `Преподаватель: *${lessonObject.teacher}* \n`;
  resultMessage += `Дата: *${lessonObject.date.split('-').reverse().join('.')}* \n`;
  resultMessage += `Время: *${lessonObject.time}*`;
  return resultMessage;
}

function schedule(){
  connect(async dataBaseClient => {
    const db = dataBaseClient.db("schedule");
    const lessonsCollection = db.collection("lessons");
    const hooksCollection = db.collection("hooks");
   
    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD
    const lessons = await lessonsCollection.find({date:today, isSent: false}).toArray() || [];
    
    const sender = async () => {
      for(const lesson of lessons){
        const hook = await hooksCollection.findOne({group: lesson.group});
        await sleep();
        sendLessonNotification(lesson, hook || {});
      }
    }
    await sender();
    await lessonsCollection.updateMany({date:today}, {$set: {isSent: true}});
  });
}

function sendLessonNotification(lesson, hook){
  if(!hook){
    Logger.sendMessage("*Ошибка!* Не найден хук для занятия. Отправка не была выполнена. \n" + formatLessonForLogger(lesson));
    return;
  }

  if(!hook.messegerType){
    Logger.sendMessage("*Ошибка!* Отсутствует тип месседжера. Отправка не была выполенна. \n" + formatLessonForLogger(lesson));
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
          "image_url": encodeURI(`${process.env.URL}/api/images/getModifiedImage?user=${lesson.teacher}&time=${lesson.time}&lessonName=${lesson.lecture}`),
          "alt_text": "изображение с анонсом занятия"
        }
      ];

      data = {
        text,
        blocks: data
      }
      const loggerObject = {
        "Тема занятия": lesson.lecture,
        "Преподаватель": lesson.teacher,
        "Группа": lesson.group,
        "Дата": lesson.date.split('-').reverse().join('.'),
        "Время": lesson.time,
      }
      sendSlackMessage(hook, data, loggerObject);
    },
    telegram: (lesson, hook) => {
      let text = getLessonText(lesson);
      const actionCallBack = getEditImage(image => {
        bot.sendPhoto(hook.channelId, image, {caption: text}).then((sentMessage) => {
          bot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id);
          Logger.sendMessage(`Уведомление успешно отправлено в *телеграмм* \n \`\`\` ${JSON.stringify(lesson, null, 2)} \`\`\` `);
        })
      });
      actionCallBack(lesson.teacher, lesson.lecture, lesson.time);
    }
  }

  configuration[hook.messegerType] && configuration[hook.messegerType](lesson, hook); // Вызов конфигурации
}

function sendSlackMessage(hook, data, loggerObject = {}){
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
    let sendMessage = response && response.statusCode === 200 ? 
      "Уведомление успешно отправлено в слак \n" :
      "*FATAL ERROR!!!* @here Неизвестная ошибка. \nstatusCode: " + response.statusCode + "\n";

    for(prop in loggerObject){
      sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
    }
    Logger.sendMessage(sendMessage);
  });
}

function sendTelegramMessage(hook, message, loggerObject = {}){
  const { channelId } = hook;

  bot.sendMessage(channelId, message).then((sentMessage) => {
    bot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id);

    let sendMessage = "Сообщение успешно отправлено в телеграмм \n";
    for(prop in loggerObject){
      sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
    }
    Logger.sendMessage(sendMessage);
  });
}

module.exports = {
  scheduler: schedule, 
  sendSlackMessage, 
  sendTelegramMessage, 
  sendLessonNotification
};