const Discord = require('discord.js');
const { connect } = require('./../util/mongoConnector');

const discordBot = new Discord.Client();

discordBot.on('ready', async() => {
  console.log('Hello!');
});

discordBot.on('message', async(message) => {
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
  connect(async (databaseClient) => {
    const db = databaseClient.db("schedule");
    const hooksCollection = db.collection("hooks");
    const channel = discordBot.channels.cache.get(message.channel.id);

    const hooks = await hooksCollection.find({$or: [{channelId: message.channel.id},{group: message.channel.name}]}).toArray();
    if(hooks.length == 0){
      databaseClient.close();
      channel.send("Ошибка! Хук уже удалён❗️❗️❗️");
      return;
    }
  
    await hooksCollection.remove({channelId: message.channel.id});
    channel.send("Хук успешно удалён");
  });
}


module.exports = discordBot;
