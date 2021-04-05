const TelegramBot = require('node-telegram-bot-api');
const { connect } = require('./../util/mongoConnector');

const {TELEGRAM_BOT_TOKEN} = process.env;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true
});

bot.onText(/\/create_hook/, async (message) => {
  const data = await bot.getChatMember(message.chat.id, message.from.id);
  bot.deleteMessage(message.chat.id, message.message_id);
  if ((data.status !== "creator") && (data.status !== "administrator")){
    bot.sendMessage(message.chat.id, "Ошибка! Команда доступна только администраторам.");
    return;
  }

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

bot.onText(/\/remove_hook/, async (message) => {
  const data = await bot.getChatMember(message.chat.id, message.from.id);
  bot.deleteMessage(message.chat.id, message.message_id);
  if ((data.status !== "creator") && (data.status !== "administrator")){
    bot.sendMessage(message.chat.id, "Ошибка! Команда доступна только администраторам.");
    return;
  }

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

    bot.deleteMessage(message.chat.id, message.message_id);
    const hook = await hooksCollection.findOne({$or: [{channelId: message.chat.id},{group: message.chat.title}]});
    if(!hook){
      client.close();
      bot.sendMessage(message.chat.id, "Хук отсутствует");
      return;
    }

    const data = await bot.getChatMember(message.chat.id, message.from.id);
    const me = await bot.getMe();
    const myData = await bot.getChatMember(message.chat.id, me.id);
    const canAsk = (data.status !== "creator") && (data.status !== "administrator");

    const now = Date.now();
    if(hook.whenLessonLastUsedDate && now - hook.whenLessonLastUsedDate < 3600*1000 && canAsk){
      if(myData.status !== "administrator"){
        bot.sendMessage(message.chat.id, "Пожалуйста, посмотрите сообщение выше, и не тревожьте меня очень часто.");
        return;
      }
      const banTime = (message.date) + 30000;

      bot.sendMessage(message.chat.id, `
По человечески просил ведь 😡. Не использовать команду часто 🤬.
${message.from.first_name || ''} ${message.from.last_name || ''}${message.from.username ? `(@${message.from.username})` : ''}
Вынужден ограничить вас с отправкой сообщений до ${new Date(banTime*1000).toLocaleTimeString()}. Пускай это послужит вам и другим уроком.
id: ${message.from.id}`);
      bot.restrictChatMember(message.chat.id, message.from.id, {can_send_messages: false, until_date:banTime});
      return;
    }
    
    const lessons = await lessonsCollection.find({group: hook.group}).toArray();
    lastUseDate = new Date();
    const result = await hooksCollection.findOneAndUpdate({$or: [{channelId: message.chat.id},{group: message.chat.title}]},
      {$set: {whenLessonLastUsedDate: lastUseDate}});

    const notPassedLessons = lessons.filter(l => (new Date() - new Date(l.date))/(1000*60*60) <= 24);//меньше суток
    if(notPassedLessons.length === 0){
      bot.sendMessage(message.chat.id, "Занятие не найдено");
      return;
    }

    let nearestLesson = notPassedLessons[notPassedLessons.length - 1];
    for (const lesson of notPassedLessons) {
      const lessonDate = new Date(lesson.date);
      if(lessonDate < new Date(nearestLesson.date))
        nearestLesson = lesson;
    }
    

    bot.sendMessage(message.chat.id, 
    `Дата ближайшего занятия: ${nearestLesson.date.split("-").reverse().join("-")} (по московскому времени).
Время: ${nearestLesson.time}.
Преподаватель: ${nearestLesson.teacher}.
Тема: "${nearestLesson.lecture}".

ВНИМАНИЕ! Важное предупреждение. Убедительная просьба не пользоваться данной командой в целях развлечения и флуда.
${myData.status == "administrator" ? 'Иначе будут применяться меры по ограничению отправки сообщения! (5-ти часовой бан 😜)' : ''}`);
  });
});

bot.onText(/\/forgive/, async (message) => {
  const data = await bot.getChatMember(message.chat.id, message.from.id);
  bot.deleteMessage(message.chat.id, message.message_id);
  if ((data.status !== "creator") && (data.status !== "administrator")){
    bot.sendMessage(message.chat.id, "Ошибка! Команда доступна только администраторам.");
    return;
  }

  const replyMessage = message.reply_to_message;
  if(!replyMessage){
    bot.sendMessage(message.chat.id, "Не понимаю, кого помиловать.");
    return;
  }

  const id = replyMessage.text.split("id: ")[1];
  const user = replyMessage.text.split("\n")[1];
  bot.restrictChatMember(message.chat.id, id, {can_send_messages: true});
  bot.sendMessage(message.chat.id, `Пользователь: ${user} помилован.`);
});

module.exports = bot;
