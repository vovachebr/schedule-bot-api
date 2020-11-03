const Jimp = require('jimp');
const text2png = require('text2png');
const { connect } = require('./mongoConnector');

function getEditImage(callback){
  return (user, lessonName, time) => {
    lessonName = formatLessonName(lessonName);
    const part = 2.5;

    const waiter = (buffer) => {
      callback(buffer);
    };

    connect(async (client) => {
      const db = await client.db('schedule');
      const imagesCollection = db.collection("images");

      let userAvatar = await imagesCollection.findOne({name: user});
      if(!userAvatar){
        userAvatar = await imagesCollection.findOne({name: "default"});
      }
      const backgroundImage = await imagesCollection.findOne({type: "фон"});

      const editableImage = await Jimp.read(backgroundImage.image.buffer);
      const userAvatarImage = await Jimp.read(userAvatar.image.buffer);
      await editableImage.resize(part * 200, part * 100);
      await userAvatarImage.resize(part * 22, part * 22);
      userAvatarImage.circle();

      const sizes = [part * 11, part * 10, part * 8, part * 7, part * 6];
      const { IMAGE_TEXT_COLOR } = process.env;
      const params = {
        color: IMAGE_TEXT_COLOR,
        output: "buffer",
        font: `${sizes[lessonName.split('\n').length-1]}px "Arial"`
      }
      let buffer = text2png(lessonName, params);
      let lessonTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      params.font = `${part * 7}px "Arial"`
      buffer = text2png(time, params);
      let timeTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      params.font = `${part * 6}px "Arial"`;
      buffer = text2png(user, params);
      let userName = await Jimp.read(Buffer.from(buffer.buffer));

     

      editableImage.blit(lessonTextImage, part * 6, part * 25);
      editableImage.blit(timeTextImage, part * 13, part * 13.5);
      editableImage.blit(userAvatarImage, part * 6.5, part * 70);
      editableImage.blit(userName, part * 32, part * 71);

      if(userAvatar.position){
        buffer = text2png(formatLessonName(userAvatar.position, 27), params);
        let userPosition = await Jimp.read(Buffer.from(buffer.buffer));
        editableImage.blit(userPosition, part * 32, part * 83);
      }

      const newBuffer = await editableImage.getBufferAsync(Jimp.AUTO);
      waiter(newBuffer);
    });
  }
}

function formatLessonName(name = '', maxLineLength = 20){
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
