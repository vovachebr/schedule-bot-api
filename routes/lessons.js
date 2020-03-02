const { MONGODB_URI } = process.env;

const guid = require('guid');
const router = require('express').Router();
const MongoClient = require("mongodb").MongoClient;

router.post("/add", function(request, response){
    let { group, date, time, teacher, lecture, additional, imageUrl } = request.body;
    
    if(!group){
        response.json({ success: false, error: "group отсутствует"});
        return;
    }

    if(!date){
        response.json({ success: false, error: "date отсутствует"});
        return;
    }

    if(!time){
        response.json({ success: false, error: "time отсутствует"});
        return;
    }

    if(!teacher){
        response.json({ success: false, error: "teacher отсутствует"});
        return;
    }

    if(!lecture){
        response.json({ success: false, error: "lecture отсутствует"});
        return;
    }
    

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        lessonsCollection.find( {group, date, time, teacher, lecture}).toArray(function(errFoundLessons, foundLessons){
            if(foundLessons.length){
                client.close();
                response.json({ success: false, error: "Такое занятие уже существует"});
                return
            }

            lessonsCollection.insertOne({ group, date, time, teacher, lecture, additional, imageUrl, id: guid.create().value, isSent: false}, function(){
                lessonsCollection.find().toArray(function(errLessons, lessons){
                    client.close();
                    response.json({ success: true, lessons: lessons});
                });
            })
        });

       
    });
});

router.post("/remove", function(request, response){
    let { id } = request.body;
    if(!id){
        response.json({ success: false, error: "id отсутствует"});
        return;
    }

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");

        if(err){
            client.close();
            response.json({ success: false, error: err});
            return;
        } 

        lessonsCollection.remove({id}).then(result => {
            lessonsCollection.find({}).toArray(function(errLessons, lessons){
                client.close();
                response.json({ success: true, lessons: lessons || []});
            });
        });
    });
});

router.get("/getLastLecture:lecture?", function(request, response){
    const { lecture } = request.query;

    if(!lecture){
        response.json({ success: false, error: "Отсутствует название лекции"});
        return;
    }

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        lessonsCollection.find({lecture}).toArray(function(errLessons, lessons = []){
            response.json({ success: true, lesson: lessons[0]});
            client.close();
        });

    });
});

router.get("/:group?", function(request, response){
    const { group } = request.query;

    const mongoClient = new MongoClient(MONGODB_URI, { useNewUrlParser: true });

    mongoClient.connect(function(err, client){
        const db = client.db("heroku_4x7x2rvn");
        const lessonsCollection = db.collection("lessons");

        if(err){
            response.json({ success: false, error: err});
            client.close();
            return;
        } 

        const filter = {};
        if(group){
            filter.group = group;
        }
        
        lessonsCollection.find({...filter}).toArray(function(errLessons, lessons){
            response.json({ success: true, lessons: lessons || []});
            client.close();
        });

    });
});

module.exports = router;