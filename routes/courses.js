var router = require('express').Router();




router.get('/', function(req, res) {
    //Get Courses
    db.collection('courses').find({}, {_id: 0}).toArray(function(err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            res.status(200).json(data);
        }
    });
});

router.get('/:courseid', function(req, res) {
    //Get Course
    db.collection('courses').find({ID: req.params.courseid}, {_id: 0}).toArray(function(err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            res.status(200).json(data[0]);
        }
    })
});


router.get('/:courseid/classes', function(req, res) {
    //Get Classes in Course
    var build = [];
    var course = {};
    db.collection('courses').find({ID: req.params.courseid}).toArray(function(err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            course = data[0];
            if (course) {
                course.Classes.forEach(function(each) {
                    db.collection('classes').find({ID: each}, {_id: 0, Name: 1, Description: 1, ID: 1} ).toArray(function(err, c) {
                        if (c.length > 0) {
                            if (err) {
                                res.status(404).json(err);
                            } else {
                                build.push(c[0]);
                                if (build.length == course.Classes.length) {
                                    var response = build;
                                    build = [];
                                    course = {};
                                    res.json(response);
                                }
                            }
                        } else {
                            res.statusCode = 404;
                            res.end(each + ' not found');
                        }

                    });
                });
            } else {
                res.statusCode = 404;
                res.end(req.params.courseid + ' not found');
            }


        }
    });
});


router.get('/:courseid/classes/:classid', function(req, res) {
    //Get Class
    db.collection('classes').find({ID: req.params.classid}, {_id: 0}).toArray(function(err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            var response = data[0];
            res.status(200).json(response);
        }
    });
});

router.post('/:courseid/classes/:classid', function(req, res) {
    //Update Class
    if (req.body.ID != req.params.classid) {
        res.statusCode = 406;
        res.end('"ID" in request body must match "classid" parameter value');
    } else {
        db.collection('classes').replaceOne(
            {ID: req.params.classid},
            req.body,
            function(err, result) {
                if (result) {
                    if (result.result.nModified == 0) {
                        res.statusCode = 404;
                        res.send('classid not found')
                    } else {
                        if (err) {
                            res.statusCode = 400;
                            res.send(err);
                        } else {
                            res.statusCode = 204;
                            res.send();
                        }
                    }
                } else {
                    res.statusCode = 404;
                    res.end('class not found');
                }
            }
        )
    }

});

router.post('/:courseid/class/create', function(req, res) {
    //Create Class
    if (!req.body.ID) {
        res.end('Must include "ID" in request body')
    }
    db.collection('classes').insertOne(
        req.body,
        function(err, result) {
            if (err) {
                res.statusCode = 400;
                res.end('ClassID already exists')
            } else {
                db.collection('courses').update(
                    {ID: req.params.courseid},
                    { $push: {Classes: req.body.ID}},
                    function (err, result) {
                        if (err || result.result.n == 0) {
                            db.collection('classes').deleteOne({ID: req.body.ID},
                                function(err, delResult) {

                                    if (err) {
                                        res.statusCode = 400;
                                        res.end('class created but not added to course');
                                    } else {
                                        if (result.result.n == 0) {
                                            res.statusCode = 404;
                                            res.end('courseID does not exist');
                                        } else {
                                            res.statusCode = 404;
                                            res.end('class could not be added to course');
                                        }
                                    }
                                })
                        } else {
                            res.statusCode = 204;
                            res.end();
                        }
                    }
                )
            }
        }
    )
});

router.post('/create', function(req, res) {
    //Create Course
    if (!req.body.ID) {
        res.statusCode = 406;
        res.end('Must include "ID" in request object');
    }
    db.collection('courses').insertOne(
        req.body,
        function(err, response) {
            if (err) {
                res.statusCode = 400;
                res.send(err)
            }
            else {
                res.statusCode = 204;
                res.end();
            }
        }

    )
});
router.post('/:courseid/update', function(req, res) {
    //Update Course
    if (req.body.ID != req.params.courseid) {
        res.statusCode = 406;
        res.end('"ID" in request body must match "courseid" parameter value');
    } else {
        if (!req.body.ID) {
            res.statusCode = 406;
            res.end('Must include "ID" in request object');
        } else {
            db.collection('courses').replaceOne(
                {ID: req.params.courseid},
                req.body,
                function(err, response) {
                    if (response.result.nModified == 0) {
                        res.statusCode = 404;
                        res.end('course not found')
                    } else {
                        if (err) {
                            res.statusCode = 400;
                            res.send(err)
                        }
                        else {
                            res.statusCode = 204;
                            res.send();
                        }
                    }

                }

            )
        }
    }


});

module.exports = router;