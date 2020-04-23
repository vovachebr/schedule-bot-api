const { MONGODB_URI } = process.env;

const router = require('express').Router();
const MongoClient = require("mongodb").MongoClient;

router.get("/", function(request, response){
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 
        
        hooksCollection.find().toArray(function(errHook, hooks){
            response.json({ success: true, hooks: hooks});
            client.close();
        });

    });
});

router.post("/add", function(request, response){
    let { value, group, channel, channelId } = request.body;
    if(!value || !group || !channel){
        response.json({ success: false, error: "Отсутствуют данные"});
        return;
    }
    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            client.close();
            response.json({ success: false, error: err});
            return;
        } 

        hooksCollection.find({$or: [{value},{group},{channel}]}).toArray(function(errHook, hooks = []){
            if(hooks.length > 0){
                client.close();
                response.json({ success: false, error: "Хук с такими значениями уже существует"});
                return;
            }
        
            hooksCollection.insertOne({ value, group, channel, channelId, messegerType: "slack" },function(err, result){

                if(err){
                    client.close();
                    response.json({ success: false, error: err});
                    return;
                } 

                hooksCollection.find({}).toArray(function(errHook, hooks){
                    client.close();
                    response.json({ success: true, hooks: hooks});
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

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        hooksCollection.remove({value}).then(result => {
            hooksCollection.find({}).toArray(function(errHook, hooks){
                response.json({ success: true, hooks: hooks});
                client.close();
            });
        });
    });
});

router.post("/update", function(request, response){
    let { oldValue, value, channel, group, channelId } = request.body;
    if(!oldValue){
        response.json({ success: false, error: "value отсутствует"});
        return;
    }

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoClient.connect(function(err, client){
        const db = client.db("schedule");
        const hooksCollection = db.collection("hooks");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        hooksCollection.findOneAndUpdate({value: oldValue}, {$set: {value, channel, group, channelId}}).then(result => {
            hooksCollection.find({}).toArray(function(errHook, hooks){
                response.json({ success: true, hooks: hooks});
                client.close();
            });
        });
    });
});

module.exports = router;