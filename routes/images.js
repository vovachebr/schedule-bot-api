const router = require('express').Router();
const multer = require('multer');
const { connect } = require('./../util/mongoConnector');

const upload = multer({ encoding: 'unicode' });
router.post("/addImage", upload.single('avatar'), async (request, response) => {
  const name = request.file.originalname.split('.')[0].trim();
  const type = 'фон';
  
  const finalImg = {
    image:  Buffer.from(request.file.buffer),
    type,
    name,
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

module.exports = router;