const TelegramBot = require('node-telegram-bot-api');
const { connect } = require('./../util/mongoConnector');

const {TELEGRAM_BOT_TOKEN, PORT, URL} = process.env;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  webHook: {port: PORT, autoOpen:false}
});
bot.setWebHook(`${URL}/bot${TELEGRAM_BOT_TOKEN}`);
bot.openWebHook();

/*const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true
});*/

bot.onText(/\/create_hook/, (message) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    const foundHooks = await hooksCollection.find({$or: [{channelId: message.chat.id},{group: message.chat.title}]}).toArray();
    if(foundHooks.length > 0){
      client.close();
      bot.sendMessage(message.chat.id, "Ошибка. Хук уже существует.");
      return;
    }

    const group = message.text.split(" ").slice(1).join();
    await hooksCollection.insertOne({group, channelId: message.chat.id, channel: message.chat.title, messegerType: "telegram" })
    bot.sendMessage(message.chat.id, "Успешно добавлено.");
  });
});

bot.onText(/\/remove_hook/, (message) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    const hooks = await hooksCollection.find({$or: [{channelId: message.chat.id},{group: message.chat.title}]}).toArray();
    if(hooks.length == 0){
      client.close();
      bot.sendMessage(message.chat.id, "Ошибка. Хук уже удалён.");
      return;
    }
  
    await hooksCollection.remove({channelId: message.chat.id});
    bot.sendMessage(message.chat.id, "Хук успешно удалён");
  });
});

bot.onText(/\/when_lesson/, (message) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");
    const lessonsCollection = db.collection("lessons");

    const hooks = await hooksCollection.find({$or: [{channelId: message.chat.id},{group: message.chat.title}]}).toArray();
    if(hooks.length == 0){
      client.close();
      bot.sendMessage(message.chat.id, "Хук отсутствует");
      return;
    }
    
    const lessons = await lessonsCollection.find({group: hooks[0].group}).toArray();

    if(lessons.length === 0){
      bot.sendMessage(message.chat.id, "Занятие не найдено");
      return;
    }

    const notPassedLessons = lessons.filter(l => new Date(l.date) > new Date());
    let nearestLesson = notPassedLessons[notPassedLessons.length - 1];
    for (const lesson of notPassedLessons) {
      const lessonDate = new Date(lesson.date);
      if(lessonDate < new Date(nearestLesson.date) && lessonDate > new Date())
        nearestLesson = lesson;
    }
    bot.sendMessage(message.chat.id, 
    `Дата ближайшего занятия: ${nearestLesson.date}.
Время: ${nearestLesson.time}.
Преподаватель: ${nearestLesson.teacher}.
Тема: "${nearestLesson.lecture}".`);
  });
});

bot.onText(/\/get_id/, (message) => {
  bot.sendMessage(message.chat.id, `chatId: ${message.chat.id}`);
});

module.exports = bot;