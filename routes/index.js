
const router = require('express').Router();
const { URL } = process.env;

const schedule = require('../schedule');
const { connect } = require('./../util/mongoConnector');

const hooks = require('./hooks');
const lessons = require('./lessons');
const templates = require('./templates');
const images = require('./images');
const defaultLessons = require('./defaultLessons');
const coordinators = require('./coordinators');

router.use('/hooks', hooks);
router.use('/lessons', lessons);
router.use('/templates', templates);
router.use('/images', images);
router.use('/defaultLessons', defaultLessons);
router.use('/coordinators', coordinators);

router.get("/start", function(request, response) {
  schedule.scheduler();
  response.send(`Запрос отправлен в обработку.`);
})

router.post("/sendInstantMessage", (request, response) => {
  const {channel, text, imageLink, imageName} = request.body;

  const imageToSend = imageName ? `${URL}/api/images/getImageByName?name=${imageName}` : imageLink
  const configer = {
    telegram: schedule.sendTelegramMessage,
    discord: schedule.sendDiscordMessage,
  };

  connect(async (client) => {
    const db = client.db("schedule");
    const hooksCollection = db.collection("hooks");

    const hook = await hooksCollection.findOne({channel});
    const sender = configer[hook.messegerType];
    const messageToLogger = {
      "Тип": "Текстовое сообщение",
      "Группа": hook.channel,
      "Текст сообщения": text,
      "Cсылка на изображение": imageToSend,
    };
    sender(hook, text, imageToSend, messageToLogger);
    response.json({ success: true});
  });
});

router.get("/getDatabaseStat", async function(request, response) {
  connect(async (client) => {
    const stats = await client.db('schedule').stats();
    const busySize = stats.indexSize + stats.dataSize; //bytes
    const allSize = 512 * 1024 * 1024; //bytes;
    
    response.json({ success: true, busySize, allSize});
  });
});

router.post("/clearLessons", async function(request, response) {
  connect(async (client) => {
    const db = await client.db('schedule');
    const lessonsCollection = db.collection("lessons");
    const statsBefore = await db.stats();
    const busySizeBefore = statsBefore.indexSize + statsBefore.dataSize; //bytes

    const lessonCountBefore = await lessonsCollection.find({}).count();
    await lessonsCollection.remove({isSent:true});
    const lessonCountAfter = await lessonsCollection.find({}).count();
    
    const statsAfter = await db.stats();
    const busySizeAfter = statsAfter.indexSize + statsAfter.dataSize; //bytes

    const allSize = 512 * 1024 * 1024; //bytes;

    response.json({
      success: true,
      deletedLessons: lessonCountAfter - lessonCountBefore,
      clearedSize: busySizeAfter - busySizeBefore,
      busySizeAfter,
      allSize
    });
  });
});

module.exports = {router};