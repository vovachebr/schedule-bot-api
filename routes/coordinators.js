const router = require('express').Router();
const json2csv = require('json2csv');
const csvtojson = require('csvtojson');
const multer = require('multer');

const { connect } = require('./../util/mongoConnector');
const upload = multer({ encoding: 'unicode' });

router.get("/", (request, response) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const coordinatorsCollection = db.collection("coordinators");
    const coordinators = await coordinatorsCollection.find({}).toArray();
    response.json({ success: true, coordinators: coordinators});
  });
});

router.get("/export_csv", (request, response) => {
  connect(async (client) => {
    const db = client.db("schedule");
    const coordinatorsCollection = db.collection("coordinators");
    let coordinators = await coordinatorsCollection.find({}).toArray();
    coordinators = coordinators.map(c => ({name: c.name, id: c.id, course: c.course}));

    const parser = new json2csv.Parser({ fields: ['name', 'id', 'course'], delimiter: ";", withBOM: true });
    const csv = parser.parse(coordinators);
    response.header('Content-Type', 'text/csv');
    response.attachment("coordinators.csv");
    return response.send(csv);
  });
});

router.post("/addFile", upload.single('coordinators'), (request, response) => {

  if(!request.file.originalname.endsWith('.csv')){
    response.json({ success: true, error: "Формат файла не CSV" });
    return;
  }

  connect(async (client) => {
    const db = client.db("schedule");
    const coordinatorsCollection = db.collection("coordinators");
    coordinatorsCollection.remove({});

    const coordinators = await csvtojson({delimiter: ";"}).fromString(request.file.buffer.toString());
    await coordinatorsCollection.insert(coordinators);

    response.json({ success: true, coordinators });
  });
});

module.exports = router;