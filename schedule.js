const request = require('request');
const Logger = require('./util/logger');
const telegramBot = require('./telegramBot');
const discordBot = require('./discordBot');

const { getEditImage } = require('./util/imageEditor');
const getLessonText = require('./util/lessonFormatter');
const { connect } = require('./util/mongoConnector');

const sleep = async () => {
  return await new Promise(resolve => setTimeout(resolve, 15000))//задержка 15сек
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
    const earlyNotifications = await lessonsCollection.find({earlyNotificationDate:today}).toArray() || [];
    
    const sender = async () => {
      for(const lesson of lessons){
        const hook = await hooksCollection.findOne({group: lesson.group});
        await sleep();
        sendLessonNotification(lesson, hook || {});
      }

      for(const notification of earlyNotifications){
        const hook = await hooksCollection.findOne({group: notification.group});
        await sleep();
        sendLessonNotification(notification, hook || {}, true);
      }
    }
    await sender();
    await lessonsCollection.updateMany({date:today}, {$set: {isSent: true}});
  });
}

function sendLessonNotification(lesson, hook, isEarly = false){
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
      let text = "<!channel> \n" + (isEarly ? lesson.earlyNotificationText : getLessonText(lesson));
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
        "Является записью": lesson.isRecordedVideo,
      }
      if(isEarly){
        loggerObject["Дата предварительного уведомления"] = lesson.earlyNotificationDate.split('-').reverse().join('.');
        loggerObject["Дата предварительного уведомления"] = lesson.earlyNotificationDate.split('-').reverse().join('.');
      }
      sendSlackMessage(hook, data, loggerObject);
    },
    telegram: (lesson, hook) => {
      let text = isEarly ? lesson.earlyNotificationText : getLessonText(lesson);
      const actionCallBack = getEditImage(image => {
        telegramBot.sendPhoto(hook.channelId, image, {caption: text}).then((sentMessage) => {
          telegramBot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id);
          Logger.sendMessage(`Уведомление успешно отправлено в *телеграмм* \n \`\`\` ${JSON.stringify(lesson, null, 2)} \`\`\` `);
        }).catch(error => Logger.sendMessage(`*Ошибка!* ${error.message}`))
      });
      actionCallBack(lesson.teacher, lesson.lecture, lesson.time);
    },
    discord: (lesson, hook) => {
      let text = '@here \n' + (isEarly ? lesson.earlyNotificationText : getLessonText(lesson));
      const loggerObject = {
        "Тема занятия": lesson.lecture,
        "Преподаватель": lesson.teacher,
        "Группа": lesson.group,
        "Дата": lesson.date.split('-').reverse().join('.'),
        "Время": lesson.time,
        "Является записью": lesson.isRecordedVideo,
      }
      if(isEarly){
        loggerObject["Дата предварительного уведомления"] = lesson.earlyNotificationDate.split('-').reverse().join('.');
        loggerObject["Дата предварительного уведомления"] = lesson.earlyNotificationDate.split('-').reverse().join('.');
      }

      const channel = discordBot.channels.cache.get(hook.channelId);
      const actionCallBack = getEditImage(image => {
        channel.send(text, { files: [{ attachment: image }] }).then(success => {
          let sendMessage = "Уведомление успешно отправлено в дискорд \n"
            for(prop in loggerObject){
              sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
            }
            Logger.sendMessage(sendMessage);
        }).catch(err => {
          connect(async dataBaseClient => {
            const db = dataBaseClient.db("schedule");
            const coordinatorsCollection = db.collection("coordinators");
            const coordinator = await coordinatorsCollection.findOne({course});
            const coordinatorNotification = (coordinator && `<@${coordinator.id}>`) || "@here";
            let sendMessage = `*FATAL ERROR!!!* ${coordinatorNotification} Неизвестная ошибка. \n\n`;
            
            for(prop in loggerObject){
              sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
            }

            sendMessage += JSON.stringify(err);
            Logger.sendMessage(sendMessage);
          });
        });
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
    const course = (loggerObject['Группа'] || "-").split("-")[0].toUpperCase();
    connect(async dataBaseClient => {
      const db = dataBaseClient.db("schedule");
      const coordinatorsCollection = db.collection("coordinators");
      const coordinator = await coordinatorsCollection.findOne({course});
      const coordinatorNotification = (coordinator && `<@${coordinator.id}>`) || "@here";
      let sendMessage = response && response.statusCode === 200 ? 
      "Уведомление успешно отправлено в слак \n" :
      `*FATAL ERROR!!!* ${coordinatorNotification} Неизвестная ошибка. \nstatusCode: ${response.statusCode}\n`;
      
      for(prop in loggerObject){
        sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
      }
      Logger.sendMessage(sendMessage);
    });
  });
}

function sendTelegramMessage(hook, message, loggerObject = {}){
  const { channelId } = hook;

  telegramBot.sendMessage(channelId, message).then((sentMessage) => {
    telegramBot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id);

    let sendMessage = "Сообщение успешно отправлено в телеграмм \n";
    for(prop in loggerObject){
      sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
    }
    Logger.sendMessage(sendMessage);
  });
}

function sendDiscordMessage(hook, message, loggerObject = {}){
  const channel = discordBot.channels.cache.get(hook.channelId);

  channel.send(message).then(success => {
    let sendMessage = "Уведомление успешно отправлено в дискорд \n"
      for(prop in loggerObject){
        sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
      }
      Logger.sendMessage(sendMessage);
  })
}


module.exports = {
  scheduler: schedule,
  sendSlackMessage,
  sendTelegramMessage,
  sendDiscordMessage,
  sendLessonNotification
};