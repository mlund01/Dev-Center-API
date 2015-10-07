var router = require('express').Router();




router.get('/', function(req, res) {
    db.collection('courses').find({}).toArray(function(err, data) {
        if (err) {
            res.status(404).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

router.get('/:courseid', function(req, res) {
    db.collection('courses').find({ID: req.params.courseid}).toArray(function(err, data) {
        if (err) {
            res.status(404).send(err);
        } else {
            res.status(200).send(data[0]);
        }
    })
});


router.get('/:courseid/classes', function(req, res) {
    var build = [];
    var course = {};
    db.collection('courses').find({ID: req.params.courseid}).toArray(function(err, data) {
        if (err) {
            res.status(404).send(err);
        } else {
            course = data[0];
            course.Classes.forEach(function(each) {
                db.collection('classes').find({ID: each}).toArray(function(err, c) {
                    if (err) {
                        res.status(404).send(err);
                    } else {
                        delete c[0].ScriptModels;
                        delete c[0].Assert;
                        delete c[0].Dependencies;
                        delete c[0].ClassMethods;
                        build.push(c[0]);
                        if (build.length == course.Classes.length) {
                            var response = build;
                            build = [];
                            course = {};
                            res.status(200).send(response);
                        }
                    }
                });
            });
        }
    });
});


router.get('/:courseid/classes/:classid', function(req, res) {
    db.collection('classes').find({ID: req.params.classid}).toArray(function(err, data) {
        if (err) {
            res.status(404).send(err);
        } else {
            res.status(200).send(data[0]);
        }
    });
});

module.exports = router;