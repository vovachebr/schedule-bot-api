const router = require('express').Router();
const multer  = require('multer');
const { connect } = require('./../util/mongoConnector');
const { getEditImage } = require('./../util/imageEditor');

const upload = multer({ encoding: 'unicode' });
router.post("/addImage",upload.single('avatar'), async (request, response) => {
  const typeWithName = request.file.originalname.split('.')[0].trim();
  let [name, position] = typeWithName.split("_");
  const type = 'преподаватель';
  
  const finalImg = {
    image:  Buffer.from(request.file.buffer),
    type,
    name,
    position
  };
  connect(async (client) => {
    const db = client.db("schedule");
    const imagesCollection = db.collection("images");

    const existImage = await imagesCollection.findOne({name});
    if(existImage){
      await imagesCollection.findOneAndUpdate({name}, {$set: {image: finalImg.image, type, name}});
      response.json({ success: true, info: "Существующее изображние было обновлено" });
      return;
    }

    await imagesCollection.insertOne(finalImg);
    response.json({ success: true, info: "Изображние было добавлено" });
  })
});

router.get("/getNamesByType:type?",async (request, response) => {
  const { type } = request.query;
  connect(async (client) => {
    const db = client.db("schedule");
    const imagesCollection = db.collection("images");

    let data = await imagesCollection.find({type}).toArray();
    data.forEach(a => { delete a.image; delete a._id});
    response.json({ success: true, data });
  })
});

router.get("/getImageByName:name?",async (request, response) => {
  const { name } = request.query;
  connect(async (client) => {
    const db = client.db("schedule");
    const imagesCollection = db.collection("images");

    let imageElement = await imagesCollection.findOne({name});
    response.contentType('image/jpeg');
    response.send(imageElement.image.buffer);
  })
});

router.get("/removeImageByName:name?",async (request, response) => {
  const { name } = request.query;
  connect(async (client) => {
    const db = client.db("schedule");
    const imagesCollection = db.collection("images");

    const removeImage = await imagesCollection.findOne({name});
    if(!removeImage){
      response.json({ success: false, error: "Элемент не найден"});
      return;
    }

    await imagesCollection.findOneAndDelete({name});
    let data = await imagesCollection.find({type: removeImage.type}).toArray();
    data.forEach(a => { delete a.image; delete a._id});
    response.json({ success: true, data});
  });
});

router.get("/getModifiedImage:user?:time?:lessonName?", async function(request, response) {
  let { user, lessonName, time } = request.query;
  const actionCallBack = getEditImage(image => response.send(image));
  response.contentType('image/jpeg');
  actionCallBack(user, lessonName, time);
});

module.exports = router;