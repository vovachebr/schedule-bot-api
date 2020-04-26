const { MONGODB_URI } = process.env;

const router = require('express').Router();
var uuid = require('node-uuid');
const MongoClient = require("mongodb").MongoClient;

router.get("/:id?", function(request, response){
    let id = request.query.id; 
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        if(id){
            templatesCollection.findOne({id}).then(function(template){
                response.json({ success: true, template});
                client.close();
            });
        }else{
            templatesCollection.find().toArray(function(errTemplate, templates){
                response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
                client.close();
            });
        }
    });
});

router.post("/remove", function(request, response){
    let { id } = request.body;
    if(!id){
        response.json({ success: false, error: "id отсутствует"});
        return;
    }

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        if(err){
            client.close();
            response.json({ success: false, error: err});
            return;
        } 

        templatesCollection.remove({id}).then(result => {
            templatesCollection.find({}).toArray(function(errTemplates, templates = []){
                client.close();
                response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
            });
        });
    });
});

router.post("/update", function(request, response){
    let { id, title, value, schedule } = request.body;

    if(!title){
        response.json({ success: false, error: "Название шаблона отсутствует"});
        return;
    }
    
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const templatesCollection = db.collection("templates");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 


        templatesCollection.findOne({title}).then(function(foundtemplate){
            if(foundtemplate){
                client.close();
                response.json({ success: false, error: "Такой шаблон уже существует"});
                return
            }

            if(id){
                templatesCollection.findOneAndUpdate({id}, {$set: {title, value, schedule}}).then(result => {
                    templatesCollection.find({}).toArray(function(errTemplates, templates){
                        response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
                        client.close();
                    });
                });
            }
            else{
                templatesCollection.insertOne({ title, value, schedule, id: uuid.v1()}, function(){
                    templatesCollection.find({}).toArray(function(errTemplates, templates){
                        response.json({ success: true, templates: templates.map(t => ({title:t.title, id: t.id}))});
                        client.close();
                    });
                })
            }
        });
    });
});



module.exports = router;