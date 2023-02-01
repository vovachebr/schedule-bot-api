const { URL } = process.env;
const telegramBot = require('./telegramBot');
const discordBot = require('./discordBot');
const Logger = require('./util/logger');
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
  Logger.sendMessage("Запускаю отправку всех сообщений", discordBot);
  connect(async dataBaseClient => {
    const db = dataBaseClient.db("schedule");
    const lessonsCollection = db.collection("lessons");
    const hooksCollection = db.collection("hooks");

    const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD
    const lessons = await lessonsCollection.find({date:today, isSent: false}).toArray() || []; // TODO: проверить, почему отправляются все сообщения
    
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

function startTemplates() {
  Logger.sendMessage("Запускаю отправку всех шаблонов", discordBot);
  const today = new Date().toISOString().slice(0,10); // сегодня в формате YYYY-MM-DD

  const configer = {
    telegram: schedule.sendTelegramMessage,
    discord: schedule.sendDiscordMessage,
  };

  connect(async (client) => {
    const db = client.db("schedule");
    const templatesCollection = db.collection("templates");
    const hooksCollection = db.collection("hooks");

    const todayTemplates = await templatesCollection.find({"schedule.date": today}).toArray() || [];

    for (let i = 0; i < todayTemplates.length; i++) {
      const template = todayTemplates[i];
      const hook = await hooksCollection.findOne({channel: template.schedule.channel});
      const sender = configer[hook.messegerType];

      const loggerMessage = {
        "Тип сообщения": "Шаблон по расписанию", 
        "Имя шаблона": template.title,
        "Канал": hook.channel,
        "Дата": template.schedule.date || "неизвестно",
      }
      sender(hook, template.value, loggerMessage);
      await templatesCollection.findOneAndUpdate({id: template.id}, {$unset: {schedule:""}})
    }
  });
}

function sendLessonNotification(lesson, hook, isEarly = false){
  if(!hook){
    Logger.sendMessage("*Ошибка!* Не найден хук для занятия. Отправка не была выполнена. \n" + formatLessonForLogger(lesson), discordBot);
    return;
  }

  if(!hook.messegerType){
    Logger.sendMessage("*Ошибка!* Отсутствует тип месседжера. Отправка не была выполенна. \n" + formatLessonForLogger(lesson), discordBot);
    return;
  }

  lesson.date = lesson.date.split('-').reverse().join('.');
  const configuration = {
    telegram: (lesson, hook) => {
      const {group, image: imageName, text} = lesson;
      const imageLink = `${URL}/api/images/getImageByName?name=${imageName}`

      telegramBot.sendPhoto(hook.channelId, imageLink, {caption: text}).then((sentMessage) => {
        telegramBot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id).catch(error => Logger.sendMessage(`У бота нет прав для закрепления сообщения`, discordBot, discordBot));
        Logger.sendMessage(`Уведомление успешно отправлено в *телеграмм* \n \`\`\` Группа: ${group} \`\`\` `, discordBot);
      }).catch(error => Logger.sendMessage(`*Ошибка!* ${error.message}`, discordBot))
    },
    discord: (lesson, hook) => {
      const channel = discordBot.channels.cache.get(hook.channelId);
      const {group, image: imageName, text, teacher, date, time, lecture} = lesson;
      const loggerObject = {
        "Тема занятия": lecture,
        "Преподаватель": teacher,
        "Группа": group,
        "Изображение": imageName,
        "Дата": date.split('-').reverse().join('.'),
        "Время": time,
      }
      const imageLink = `${URL}/api/images/getImageByName?name=${imageName}`;

      channel.send(text, { files: [{ attachment: imageLink, name: 'picture.png' }] }).then(success => {
        let sendMessage = "Уведомление успешно отправлено в дискорд \n"
          for(prop in loggerObject){
            sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
          }
          Logger.sendMessage(sendMessage, discordBot);
      }).catch(err => {
        connect(async dataBaseClient => {
          const db = dataBaseClient.db("schedule");
          const coordinatorsCollection = db.collection("coordinators");
          const coordinator = await coordinatorsCollection.findOne({group});
          const coordinatorNotification = (coordinator && `<@${coordinator.id}>`) || "@here";
          let sendMessage = `*FATAL ERROR!!!* ${coordinatorNotification} Неизвестная ошибка. \n\n`;
          
          for(prop in loggerObject){
            sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
          }

          sendMessage += JSON.stringify(err);
          Logger.sendMessage(sendMessage, discordBot);
        });
      });
    }
  }

  configuration[hook.messegerType] && configuration[hook.messegerType](lesson, hook); // Вызов конфигурации
}

function sendTelegramMessage(hook, message, imageLink, loggerObject = {}){
  const { channelId } = hook;

  (imageLink ? 
    telegramBot.sendPhoto(channelId, imageLink, {caption: message}) :
    telegramBot.sendMessage(channelId, message)).
      then((sentMessage) => {
        telegramBot.pinChatMessage(sentMessage.chat.id, sentMessage.message_id).catch(error => Logger.sendMessage(`У бота нет прав для закрепления сообщения`, discordBot, discordBot));
        let sendMessage = "Сообщение успешно отправлено в телеграмм \n";
        for(prop in loggerObject){
          sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
        }
        Logger.sendMessage(sendMessage, discordBot);
    });
}

function sendDiscordMessage(hook, message, imageLink, loggerObject = {}){
  const channel = discordBot.channels.cache.get(hook.channelId);
  const files = imageLink ? { files: [{ attachment: imageLink, name: 'picture.png' }] } : undefined;
  
  channel.send(message, files).then(success => {
    let sendMessage = "Уведомление успешно отправлено в дискорд \n"
      for(prop in loggerObject){
        sendMessage += `${prop}: *${loggerObject[prop]}* \n`;
      }
      Logger.sendMessage(sendMessage, discordBot);
  });
}


module.exports = {
  scheduler: schedule,
  sendTelegramMessage,
  sendDiscordMessage,
  sendLessonNotification,
  startTemplates,
};