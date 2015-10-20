var router = require('express').Router();
var Logger = require('le_node');
var log = new Logger({
    token: '53ee35a0-698a-4357-b3b7-c1c39139856a'
});
var Underscore = require('underscore');


//NON-ADMIN ENDPOINTS


function requireField(field, body, errors) {
    var success = false;
    for (var val in body) {
        if (field == val) {
            success = true;
        }
    }
    if (!success) {
        errors.push("'" + field + "'" + " is required");
    }
    return errors;

}

router.get('/', function(req, res) {
    //Get Courses
    db.collection('courses').find({CourseType: req.query.courseType}, {_id: 0}).toArray(function(err, data) {
        if (err) {
            log.err({collection: 'course', action: 'Get Courses', endpoint: '/courses', error: err});
            res.status(404).json(err);
        } else {
            log.info({msg: 'Entered Courses Page'});
            res.status(200).json(data);
        }
    });
});

router.get('/:courseid', function(req, res) {
    //Get Course
    db.collection('courses').find({ID: req.params.courseid}, {_id: 0}).toArray(function(err, data) {
        if (err) {
            log.err({collection: 'course', action: 'Get Course', endpoint: '/courses/' + req.params.courseid, error: err});
            res.status(404).json(err);
        } else {
            if (data.length == 0) {
                log.err({collection: 'course', action: 'Get Course', endpoint: '/courses/' + req.params.courseid, error: 'course not found'});
                res.status(404).json({error: 'course not found'});
            } else {
                if (!req.header.administrator) {
                    if (!data[0].Active) {
                        res.status(404).json({error: req.params.courseid + ' is inactive'})
                    } else {
                        log.info({course: req.params.courseid, method: 'GET', action: 'Viewed Course', msg: 'Entered ' + req.params.courseid + ' Course Page'});
                        res.status(200).json(data[0]);
                    }
                } else {
                    res.status(200).json(data[0]);
                }

            }

        }
    })
});


router.get('/:courseid/classes', function(req, res) {
    //Get Classes in Course
    var build = [];
    var course = {};
    var adjustLength = 0;
    db.collection('courses').find({ID: req.params.courseid}).toArray(function(err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            course = data[0];
            if (course && !course.Active && !req.headers.administrator) {
                res.status(400).json({error: req.params.courseid + ' is inactive'})
            } else {
                if (course) {
                    course.Classes.forEach(function(each) {
                        db.collection('classes').find({ID: each}, {_id: 0, Name: 1, Description: 1, ID: 1, Active: 1} ).toArray(function(err, c) {
                            if (c.length > 0) {
                                if (err) {
                                    res.status(404).json(err);
                                } else {
                                    c[0].CourseOrder = course.Classes.indexOf(each) + 1;
                                    if (c[0].Active || req.headers.administrator && !c[0].Active) {
                                        delete c[0].Active;
                                        build.push(c[0]);
                                    } else {
                                        adjustLength += 1;
                                    }
                                    ///here///
                                    if (build.length == course.Classes.length - adjustLength) {
                                        res.json(build);
                                    }
                                }
                            } else {
                                build.push({ID: each, Name: '404', Description: 'Not Found'})
                            }

                        });
                    });
                } else {
                    res.statusCode = 404;
                    res.json({error: req.params.courseid + ' course not found'});
                }
            }

        }
    });
});


router.get('/:courseid/classes/:classid', function(req, res) {
    //Get Class
    db.collection('courses').find({ID: req.params.courseid}, {_id: 0, Classes: 1}).toArray(function(err, data) {
        if (!data[0]) {
            res.status(400).json({error: req.params.courseid + ' course does not exist'})
        }
        else if (data[0].Classes.indexOf(req.params.classid) == -1) {
            res.status(400).json({error: req.params.classid + ' class is not in ' + req.params.courseid + ' course, or does not exist'})
        } else {
            db.collection('classes').find({ID: req.params.classid}, {_id: 0}).toArray(function(err, data) {
                if (err) {
                    res.status(404).json(err);
                } else {
                    var response = data[0];
                    if (!req.headers.administrator && response.Active) {
                        log.info({_course: req.params.courseid, _class: req.params.classid, Method: 'GET', action: 'Started Class', msg: 'Entered ' + req.params.classid + ' class in ' + req.params.courseid + ' course.'});
                        res.status(200).json(response);
                    } else if (!req.headers.administrator && !response.Active) {
                        res.status(400).json({error: req.params.classid + ' is inactive'})
                    } else {
                        res.status(200).json(response);
                    }

                }
            });
        }
    });

});


//ADMIN ENDPOINTS


router.use(function(req, res, next) {
    if (req.User.Admin) {
        next();
    } else {
        res.status(405).json({error: 'Must be an Admin User to Make this Request in ' + req.baseUrl})
    }
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

router.post('/:courseid/create-class', function(req, res) {
    //Create Class
    var errors = [];
    var requiredFields = ['Name', 'Active', 'Description'];
    requiredFields.forEach(function(each) {
        requireField(each, req.body, errors);
    });
    if (errors.length != 0) {
        res.status(401).json({error: 'Missing Fields', fields: errors});
    } else {
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
    }

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

router.patch('/:courseid', function(req, res) {
    //Patch Class
    if (!req.body) {
        res.status(401).json({error: "request body is required"})
    }
    else {
        var modObj = {};
        var oldKeys = [];
        db.collection('courses').findOne({ID: req.params.courseid}, function(err, data) {
            if (err) {
                res.status(500).json({error: "system error", mongoError: err})
            } else if (!data) {
                res.status(404).json({error: req.params.courseid + ' not found'})
            } else {
                for (var key in data) {
                    oldKeys.push(key);
                }
                for (var newKey in req.body) {
                    if (oldKeys.indexOf(newKey) > -1) {
                        modObj[newKey] = req.body[newKey];
                    }
                }

                db.collection('courses').updateOne({ID: req.params.courseid}, {"$set": modObj}, function(err, data) {
                    if (err) {
                        res.status(500).json({error: 'class could not be updated'})
                    } else if (data.result.nModified == 0) {
                        res.status(404).json({error: req.params.courseid + ' not found'})
                    } else {
                        res.status(204).send();
                    }
                })
            }
        });
    }
});

router.get('/checkIfIdExists/:courseid', function(req, res) {
    //Check if CourseID exists
    if (req.query.collection == 'courses' || req.query.collection == 'classes') {
        db.collection(req.query.collection).findOne({ID: req.params.courseid}, function(err, data) {
            if (err) {
                res.status(500).json({error: err});
            } else if (!data) {
                res.status(200).json({exists: false});
            } else {
                res.status(200).json({exists: true});
            }
        })
    } else {
        res.status(406).json({error: "collection query param must be set to 'courses' or 'classes'"});
    }
});


module.exports = router;