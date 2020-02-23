const { CONNECTION_STRING } = process.env;

const router = require('express').Router();
const MongoClient = require("mongodb").MongoClient;
const mongoClient = new MongoClient(CONNECTION_STRING, { useNewUrlParser: true });

router.get("/", function(request, response){
    mongoClient.connect(function(err, client){
        console.log("CONNECTION_STRING:", CONNECTION_STRING);
        console.log(err, client);
        const db = client.db("shedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return
        } 
        
        hooksCollection.find({}).toArray(function(errHook, hooks){
            response.json({ success: true, hooks: hooks});
        });

    });
});

router.post("/add", function(request, response){
    let { value, group, channel } = request.body;
    if(!value || !group || !channel){
        response.json({ success: false, error: "Отсутствуют данные"});
        return;
    }

    mongoClient.connect(function(err, client){
        const db = client.db("shedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 

        hooksCollection.find({$or: [{value},{group},{channel}]}).toArray(function(errHook, hooks){
            if(!hooks && hooks.length){
                response.json({ success: false, error: "Хук с такими значениями уже существует"});
                client.close();
                return;
            }
        
            hooksCollection.insertOne({ value, group, channel },function(err, result){

                if(err){
                    response.json({ success: false, error: err});
                    return
                } 

                hooksCollection.find({}).toArray(function(errHook, hooks){
                    response.json({ success: true, hooks: hooks});
                    client.close();
                });
            });
        });
    });
});

router.post("/remove", function(request, response){
    let { value } = request.body;
    if(!value){
        response.json({ success: false, error: "value отсутствует"});
        return;
    }

    mongoClient.connect(function(err, client){
        const db = client.db("shedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            return;
        } 

        hooksCollection.remove({value}).then(result => {
            hooksCollection.find({}).toArray(function(errHook, hooks){
                response.json({ success: true, hooks: hooks});
            });
        });
    });
});

module.exports = router;