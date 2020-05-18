const Jimp = require('jimp');
const text2png = require('text2png');
const { connect } = require('./mongoConnector');

function getEditImage(callback){
  return (user, lessonName, time, date) => {
    const timeDate = `${time}, СЕГОДНЯ, ${date}`;
    lessonName = formatName(lessonName);
    const part = 2.5;
    connect(async (client) => {
      const db = await client.db('schedule');
      const imagesCollection = db.collection("images");

      let userAvatar = await imagesCollection.findOne({name: user});
      if(!userAvatar){
        userAvatar = await imagesCollection.findOne({name: "default"});
      }
      const logo = await imagesCollection.findOne({type: "лого"});
      const backgroundImagesCount = await imagesCollection.find({type: "фон"}).count();
      const index = Math.floor(Math.random() * backgroundImagesCount);
      const backgroundImage = await imagesCollection.find({type: "фон"}).limit(-1).skip(index).next();

      const editableImage = await Jimp.read(backgroundImage.image.buffer);
      const logoImage = await Jimp.read(logo.image.buffer);
      const userAvatarImage = await Jimp.read(userAvatar.image.buffer);
      await editableImage.resize(part * 200, part * 100);
      await logoImage.resize(part * 60, Jimp.AUTO);
      await userAvatarImage.resize(part * 20, part * 20);
      userAvatarImage.circle();

      const sizes = [part * 11, part * 10, part * 8, part * 7, part * 6];
      const { IMAGE_TEXT_COLOR } = process.env;
      const params = {
        color: IMAGE_TEXT_COLOR,
        output: "buffer",
        font: `${sizes[lessonName.split('\n').length-1]}px sans-serif`
      }
      let buffer = text2png(lessonName, params);
      let lessonTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      params.font = `${part * 7}px sans-serif`
      buffer = text2png(timeDate, params);
      let timeDateTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      const userText = `${user} \n${formatName(userAvatar.position) || ''}`
      buffer = text2png(userText, params);
      let userTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      editableImage.blit(logoImage, part * 6, part * 6);
      editableImage.blit(lessonTextImage, part * 6, part * 25);
      editableImage.blit(timeDateTextImage, part * 6, part * 60);
      editableImage.blit(userAvatarImage, part * 6, part * 70);
      editableImage.blit(userTextImage, part * 30, part * 73);

      const newBuffer = await editableImage.getBufferAsync(Jimp.AUTO);
      callback(newBuffer);
    });
  }
}

function formatName(name){
  const maxLineLength = 25;
  const separated = name.split(" ");
  let accomulator = 0;
  let newName = "";
  for(let i = 0; i < separated.length; i++){
    const current = separated[i];
    if((accomulator + current.length) > maxLineLength){
      accomulator = 0;
      newName+=`\n${current} `;
      continue;
    }

    newName += `${current} `;
    accomulator += (current.length + 1);
  }
  return newName;
}

module.exports = {
  getEditImage
}
