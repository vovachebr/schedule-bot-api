const TelegramBot = require('node-telegram-bot-api');
const MongoClient = require("mongodb").MongoClient;

const {TELEGRAM_BOT_TOKEN, MONGODB_URI} = process.env;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true
    //TODO: изменить на webhook
});

bot.onText(/\/create_hook/, (message) => {
    console.log(message);
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const hooksCollection = db.collection("hooks");

        if(err){
            client.close();
            bot.sendMessage(message.chat.id, `Ошибка: ${JSON.stringify(err)}`);
            return;
        } 

        hooksCollection.find({$or: [{channelId: message.chat.id},{group: message.chat.title}]}).toArray(function(errHook, hooks = []){
            if(hooks.length > 0){
                client.close();
                bot.sendMessage(message.chat.id, "Ошибка. Хук уже существует.");
                return;
            }
        
            const group = message.text.split(" ").slice(1).join();
            hooksCollection.insertOne({group, channelId: message.chat.id, channel: message.chat.title, messegerType: "telegram" },function(err, result){
                
                if(err){
                    client.close();
                    bot.sendMessage(message.chat.id, `Ошибка: ${JSON.stringify(err)}`);
                    return;
                } 
                
                bot.sendMessage(message.chat.id, "Успешно добавлено.");
                client.close();
            });
        });
    });
});

bot.onText(/\/remove_hook/, (message) => {
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const hooksCollection = db.collection("hooks");

        if(err){
            client.close();
            bot.sendMessage(message.chat.id, `Ошибка: ${JSON.stringify(err)}`);
            return;
        } 

        hooksCollection.find({$or: [{channelId: message.chat.id},{group: message.chat.title}]}).toArray(function(errHook, hooks = []){
            if(hooks.length == 0){
                client.close();
                bot.sendMessage(message.chat.id, "Хук уже отсутствует");
                return;
            }
        
            hooksCollection.remove({channelId: message.chat.id}).then(result => {
                bot.sendMessage(message.chat.id, "Хук успешно удалён");
            });
        });
    });
});

module.exports = bot;