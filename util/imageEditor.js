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

      const backgroundImage = await imagesCollection.findOne({type: "фон"});
      const editableImage = await Jimp.read(backgroundImage.image.buffer);

      const sizes = [part * 11, part * 10, part * 8, part * 7, part * 6];
      const { IMAGE_TEXT_COLOR } = process.env;
      const params = {
        color: IMAGE_TEXT_COLOR,
        output: "buffer",
        lineSpacing: 10,
        font: `${sizes[lessonName.split('\n').length-1]}px "Arial"`
      }
      let buffer = text2png(lessonName, params);
      let lessonTextImage = await Jimp.read(Buffer.from(buffer.buffer));
      params.font = `${part * 7}px "Arial"`;
      params.lineSpacing = 2;
      buffer = text2png(time, params);
      let timeTextImage = await Jimp.read(Buffer.from(buffer.buffer));

      await editableImage.resize(part * 200, part * 100);
      editableImage.blit(lessonTextImage, part * 6, part * 25);
      editableImage.blit(timeTextImage, part * 13, part * 13.5);
      const users = user.split(",");
      if(users.length === 1){
        let userAvatar = await imagesCollection.findOne({name: user});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        
        const userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();
  
        params.font = `${part * 6}px "Arial"`;
        buffer = text2png(user, params);
        let userName = await Jimp.read(Buffer.from(buffer.buffer));

        editableImage.blit(userAvatarImage, part * 6.5, part * 70);
        editableImage.blit(userName, part * 32, part * 71);
  
        if(userAvatar.position){
          buffer = text2png(formatLessonName(userAvatar.position, 27), params);
          let userPosition = await Jimp.read(Buffer.from(buffer.buffer));
          editableImage.blit(userPosition, part * 32, part * 83);
        }
      } else if (users.length === 2) {
        const [user1, user2] = user.split(",").map(u => u.trim());

        let userAvatar = await imagesCollection.findOne({name: user1});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        let userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();

        params.font = `${part * 6}px "Arial"`;
        buffer = text2png(user1, params);
        let userName = await Jimp.read(Buffer.from(buffer.buffer));
        
        editableImage.blit(userAvatarImage, part * 6.5, part * 70);
        editableImage.blit(userName, part * 57, part * 72);

        userAvatar = await imagesCollection.findOne({name: user2});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();

        params.font = `${part * 6}px "Arial"`;
        buffer = text2png(user2, params);
        userName = await Jimp.read(Buffer.from(buffer.buffer));

        editableImage.blit(userAvatarImage, part * 30, part * 70);
        editableImage.blit(userName, part * 57, part * 82);

      } else if (users.length === 3) {
        const [user1, user2, user3] = user.split(",").map(u => u.trim());

        let userAvatar = await imagesCollection.findOne({name: user1});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        let userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();

        params.font = `${part * 6}px "Arial"`;
        buffer = text2png(user1, params);
        let userName = await Jimp.read(Buffer.from(buffer.buffer));
        
        editableImage.blit(userAvatarImage, part * 6.5, part * 70);
        editableImage.blit(userName, part * 80, part * 67);

        userAvatar = await imagesCollection.findOne({name: user2});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();

        buffer = text2png(user2, params);
        userName = await Jimp.read(Buffer.from(buffer.buffer));
        editableImage.blit(userAvatarImage, part * 30, part * 70);
        editableImage.blit(userName, part * 80, part * 77);

        userAvatar = await imagesCollection.findOne({name: user3});
        if(!userAvatar){
          userAvatar = await imagesCollection.findOne({name: "default"});
        }
        userAvatarImage = await Jimp.read(userAvatar.image.buffer);
        await userAvatarImage.resize(part * 22, part * 22);
        userAvatarImage.circle();
        buffer = text2png(user3, params);

        userName = await Jimp.read(Buffer.from(buffer.buffer));

        editableImage.blit(userAvatarImage, part * 53.5, part * 70);
        editableImage.blit(userName, part * 80, part * 87);
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
