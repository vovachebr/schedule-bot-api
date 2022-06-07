const Discord = require('discord.js');
const { connect } = require('./../util/mongoConnector');
const Logger = require('../util/logger');

const client = new Discord.Client();

client.on('ready', async() => {
  console.log('Hello!');
});

client.on('message', async(message) => {
  if(message.author.bot) return;
  if(!message.guild) return;

  const roles = Array.from(message.member.roles.cache).map(e => e[1].name.toLowerCase());

  if(message.content.includes('/create_hook')) {
    if(!roles.includes('coordinator') && !roles.includes('координатор')) {
      message.reply('Ошибка! Данная комманда доступна только координаторам');
      return;
    }

    createHook(message);
    return;
  }

  if(message.content.includes('/remove_hook')) {
    if(!roles.includes('coordinator') && !roles.includes('координатор')) {
      message.reply('Ошибка! Данная комманда доступна только координаторам❗️❗️❗️');
      return;
    }

    removeHook(message);
    return;
  }

  if(message.content.includes('/addme')) {
    addUserToGroup(message);
    return;
  }
});

function createHook(message) {
  const group = message.content.split(' ')[1];
  if(!group) {
    message.reply('Ошибка! Необходимо добавить название учебной группы❗️❗️❗️');
    return;
  }

  const channel = message.client.channels.cache.get(message.channel.id);

  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    const foundHooks = await hooksCollection.find({$or: [{channelId: message.channel.id},{group: message.channel.name}]}).toArray();
    if(foundHooks.length > 0){
      client.close();
      channel.send("Ошибка! Хук уже существует❗️❗️❗️");
      return;
    }

    await hooksCollection.insertOne({group, channelId: message.channel.id, channel: message.channel.name, messegerType: "discord" })
    channel.send("Успешно добавлено.");
  });
}

function removeHook(message) {
  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");
    const channel = client.channels.cache.get(message.channel.id);

    const hooks = await hooksCollection.find({$or: [{channelId: message.channel.id},{group: message.channel.name}]}).toArray();
    if(hooks.length == 0){
      client.close();
      channel.send("Ошибка! Хук уже удалён❗️❗️❗️");
      return;
    }
  
    await hooksCollection.remove({channelId: message.channel.id});
    channel.send("Хук успешно удалён");
  });
}

function addUserToGroup(message) {
  const group = message.content.split(' ')[1];
  connect(async (databaseClient) => {
    const db = databaseClient.db("schedule");
    const hooksCollection = db.collection("hooks");

    const foundHook = await hooksCollection.findOne({group});
    const userToLogging = {
      id: message.member.id,
      real_name: message.member.user.username
    }
    if(!foundHook){
      message.reply(`Канал **${group}** не найден. Обратитесь к координатору курса за помощью.`);
      Logger.sendUserTextMessage(userToLogging, message.channel.name, `Неудачная попытка пользователя перенестись в канал *${group}*. ☹️`);
      return;
    }

    const channel = client.channels.cache.get(foundHook.channelId);
    channel.updateOverwrite(message.member, {
      SEND_MESSAGES: true,
      VIEW_CHANNEL: true
    })
    .then(res => {
      message.reply(`Успешно добавил вас в канал **${group}**`);
      Logger.sendUserTextMessage(userToLogging, message.channel.name, `Удачная попытка пользователя перенестись в канал *${group}*. 🎉`);
    })
    .catch(err => {
      message.reply('Кажется, у меня возникла какая-то ошика');
      Logger.sendUserTextMessage(userToLogging, message.channel.name, `Неудачная попытка пользователя перенестись в канал *${group}*. ☹️ \n ОШИБКА: ${JSON.stringify(err)} \n`)
    });
  });
}

module.exports = client;
