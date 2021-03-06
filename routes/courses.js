var router = require('express').Router();
var Logger = require('le_node');
var log = new Logger({
    token: '53ee35a0-698a-4357-b3b7-c1c39139856a'
});
var analytics = require('../middleware/analytics');
var Underscore = require('underscore');


router.use(function (req, res, next) {
    if (req.AccessGranted) {
        next();
    } else {
        res.status(403).json({error: 'Access has been denied for this request'})
    }
});
//NON-ADMIN ENDPOINTS
function requireFields(fields, body) {
    var errors = [];
    fields.forEach(function (field) {
        var success = false;
        for (var val in body) {
            if (field == val) {
                success = true;
            }
        }
        if (!success) {
            errors.push("'" + field + "'" + " is required");
        }
    });

    return errors;

}

router.get('/', function (req, res) {
    //Get Courses
    db.collection('courses').find({CourseType: req.query.courseType}, {_id: 0}).toArray(function (err, data) {
        if (err) {
            log.err({collection: 'course', action: 'Get Courses', endpoint: '/courses', error: err});
            res.status(404).json(err);
        } else {
            if (req.User.Admin && req.query.adminPage) {
                res.status(200).json(data);
            }
            else {
                data = Underscore.where(data, {Active: true});
                res.status(200).json(data);
            }

        }
    });
});

router.get('/:courseid', function (req, res) {
    //Get Course
    db.collection('courses').find({
        ID: req.params.courseid,
        CourseType: req.query.courseType
    }, {_id: 0}).toArray(function (err, data) {
        if (err) {
            log.err({
                collection: 'course',
                action: 'Get Course',
                endpoint: '/courses/' + req.params.courseid,
                error: err
            });
            res.status(404).json(err);
        } else {
            if (data.length == 0) {
                log.err({
                    collection: 'course',
                    action: 'Get Course',
                    endpoint: '/courses/' + req.params.courseid,
                    error: 'course not found'
                });
                res.status(404).json({error: 'course not found'});
            } else {
                if (!req.User.Admin) {
                    if (!data[0].Active) {
                        res.status(404).json({error: req.params.courseid + ' is inactive'})
                    } else {
                        res.status(200).json(data[0]);
                    }
                } else {
                    res.status(200).json(data[0]);
                }

            }

        }
    })
});


router.get('/:courseid/classes', function (req, res) {
    //Get Classes in Course
    var build = [];
    var course = {};
    var adjustLength = 0;
    db.collection('courses').find({ID: req.params.courseid}).toArray(function (err, data) {
        if (err) {
            res.status(404).json(err);
        } else {
            course = data[0];
            if (course && !course.Active && !req.User.Admin) {
                res.status(400).json({error: req.params.courseid + ' is inactive'})
            } else {
                if (course) {
                    if (Underscore.isEmpty(req.query)) {
                        req.query = {_id: 0};
                    } else {
                        req.query._id = 0;
                    }
                    course.Classes.forEach(function (each) {
                        db.collection('classes').find({ID: each}, req.query).toArray(function (err, c) {
                            if (c.length > 0) {
                                if (err) {
                                    res.status(404).json(err);
                                } else {
                                    c[0].CourseOrder = course.Classes.indexOf(each) + 1;
                                    if (c[0].Active || req.User.Admin && !c[0].Active) {
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


router.get('/:courseid/classes/:classid', function (req, res) {
    //Get Class
    db.collection('courses').find({ID: req.params.courseid}, {_id: 0, Classes: 1}).toArray(function (err, course) {
        if (!course[0]) {
            res.status(400).json({error: req.params.courseid + ' course does not exist'})
        }
        else if (course[0].Classes.indexOf(req.params.classid) == -1) {
            res.status(400).json({error: req.params.classid + ' class is not in ' + req.params.courseid + ' course, or does not exist'})
        } else {
            db.collection('classes').find({ID: req.params.classid}, {
                _id: 0,
                CreatedBy: 0
            }).toArray(function (err, data) {
                if (err) {
                    res.status(404).json(err);
                } else {
                    var response = data[0];
                    response.CourseOrder = course[0].Classes.indexOf(req.params.classid) + 1;
                    if (!req.User.Admin && response.Active) {
                        if (req.UserEnv == 'users') {
                            analytics.classEntryEvent(req.params.courseid, req.params.classid, req.User.Email, req.User.FirstName, req.User.LastName);
                        }
                        res.status(200).json(response);
                    } else if (!req.User.Admin && !response.Active) {
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


router.use(function (req, res, next) {
    if (req.User.Admin) {
        next();
    } else {
        res.status(405).json({error: 'Must be an Admin User to Make this Request in ' + req.baseUrl})
    }
});


function copyToClassArchive(classObj, user) {
    var d = new Date();
    classObj.ModifiedOn = d;
    classObj.UpdatedBy = user.Username;
    db.collection('class_archive').insertOne(classObj);
}


router.post('/:courseid/classes/:classid', function (req, res) {
    //Update Class
    if (req.body.ID != req.params.classid) {
        res.statusCode = 406;
        res.end('"ID" in request body must match "classid" parameter value');
    } else {
        if (req.body.CourseOrder) {
            delete req.body.CourseOrder;
        }
        db.collection('classes').findOne({ID: req.params.classid}, {_ID: 0}, function (err, data) {
            if (err) {
                res.status(500).json({error: 'Could not copy class, class not updated', stack: err})
            } else if (!data) {
                res.status(404).json({msg: 'class not found'})
            } else {
                copyToClassArchive(data, req.User);
                db.collection('classes').replaceOne(
                    {ID: req.params.classid},
                    req.body,
                    function (err, result) {
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
        })

    }

});

router.post('/:courseid/classes/:classid/copy', function (req, res) {
    //Copy Existing Class into Staging
    db.collection('classes').findOne({ID: req.params.classid}, {_id: 0}, function (err, data) {
        if (err) {
            res.status(500).json({error: 'cannot copy class at this time'});
        } else if (!data) {
            res.status(404).json({error: 'cannot find class'})
        } else {
            db.collection('staged_classes').insertOne(data, function (err, data) {
                if (err) {
                    res.status(500).json({error: 'cannot copy class at this time'});
                } else if (data.result.nInserted == 0) {
                    res.status(500).json({error: 'cannot copy class at this time'});
                } else {
                    db.collection('classes').updateOne({ID: req.params.classid}, {"$set": {EditMode: true}}, function (err, result) {
                        if (err) {
                            res.status(500).json({msg: 'class copied but "InStaging" value not updated in courses'})
                        } else if (result.result.nModified == 0) {
                            res.status(404).json({msg: 'class added to staging but not found in "classes" collection'})
                        } else {
                            res.status(204).send();
                        }
                    });

                }
            })
        }
    })
});

router.get('/:courseid/staged-classes/:classid', function (req, res) {
    //Get staged-Class
    db.collection('courses').find({ID: req.params.courseid}, {_id: 0, Classes: 1}).toArray(function (err, course) {
        if (!course[0]) {
            res.status(400).json({error: req.params.courseid + ' course does not exist'})
        }
        else if (course[0].Classes.indexOf(req.params.classid) == -1) {
            res.status(400).json({error: req.params.classid + ' class is not in ' + req.params.courseid + ' course, or does not exist'})
        } else {
            db.collection('staged_classes').find({ID: req.params.classid}, {
                _id: 0,
                CreatedBy: 0
            }).toArray(function (err, data) {
                if (err) {
                    res.status(404).json(err);
                } else if (!data) {
                    res.status(404).json({msg: 'could not find class in "staged_classes"'})
                } else {
                    var response = data[0];
                    response.CourseOrder = course[0].Classes.indexOf(req.params.classid) + 1;
                    res.status(200).json(response);
                }
            });
        }
    });

});

router.post('/:courseid/staged-classes/:classid', function (req, res) {
    //Update Staged Class
    if (req.body.ID != req.params.classid) {
        res.statusCode = 406;
        res.end('"ID" in request body must match "classid" parameter value');
    } else {
        if (req.body.CourseOrder) {
            delete req.body.CourseOrder;
        }
        db.collection('staged_classes').findOne(
            {ID: req.params.classid},
            {_id: 0},
            function (err, data) {
                if (err) {
                    req.status(500).json({error: 'could not make copy of class', stack: err})
                } else if (!data) {
                    req.status(404).json({msg: 'Class not found in staging'})
                } else {
                    db.collection('staged_classes').replaceOne(
                        {ID: req.params.classid},
                        req.body,
                        function (err, result) {
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
            }
        )

    }
});

router.delete('/:courseid/staged-classes/:classid/cancel', function (req, res) {
  db.collection('staged_classes').removeOne({ID: req.params.classid}, function(err, data) {
      if (err) {
          res.status(500).json({error: 'could not remove staged_class', stack: err})
      } else if (data.result.nModified == 0) {
          res.status(404).json({msg: 'could not find class in staging'})
      } else {
          db.collection('classes').updateOne({ID: req.params.classid}, {"$set": {EditMode: false}}, function(err, data) {
              if (err) {
                  res.status(500).json({msg: 'staged class deleted but could not change "EditMode" to false in class object in "classes". Please change manually'})
              } else if (data.result.nModified == 0) {
                  res.status(404).json({msg: 'could not find class in "classes" collection. Please modify "EditMode" to false manually'})
              } else {
                  res.status(204).send();
              }
          })
      }
  })
});

router.post('/:courseid/staged-classes/:classid/replace', function (req, res) {
    //Replace real class with Staged Class
    db.collection('staged_classes').findOne(
        {ID: req.params.classid},
        {_id: 0},
        function (err, newClass) {
            if (err) {
                res.status(500).json({error: 'could not make copy of class', stack: err})
            } else if (!newClass) {
                res.status(404).json({msg: 'Class not found in staging'})
            } else {
                db.collection('classes').findOne({ID: req.params.classid}, {_id: 0}, function (err, oldClass) {
                    if (err) {
                        res.status(500).json({error: 'Server Error', stack: err})
                    } else if (!oldClass) {
                        res.status(404).json({msg: 'Class not found in classes collection'})
                    } else {
                        copyToClassArchive(oldClass, req.User);
                        newClass.EditMode = false;
                        db.collection('classes').replaceOne({ID: req.params.classid}, newClass, function (err, data2) {
                            if (err) {
                                res.status(500).json({error: 'Server Error', stack: err})
                            } else if (data2.result.nModified == 0) {
                                res.status(404).json({msg: 'Class not found in classes collection'})
                            } else {
                                db.collection('staged_classes').removeOne({ID: req.params.classid}, function (err, data3) {
                                    if (err) {
                                        res.status(500).json({
                                            error: 'class replaced but not removed from staging, please remove manually',
                                            stack: err
                                        })
                                    } else if (data3.result.nModified == 0) {
                                        res.status(404).json({msg: 'class replaced but could not be found to replace in staging, please replace manually'})
                                    } else {
                                        res.status(204).send();
                                    }
                                })
                            }
                        })
                    }
                })

            }
        }
    );
});

router.post('/:courseid/create-class', function (req, res) {
    //Create Class
    var errors = requireFields(['ID', 'Name'], req.body);
    if (errors.length != 0) {
        res.status(401).json({error: 'Missing Fields', fields: errors});
    } else {

        db.collection('courses').findOne({ID: req.params.courseid}, {Classes: 1}, function (err, classes) {
            if (err) {
                res.status(500).json({error: 'could not access' + req.params.courseid + ' course at this time'});
            } else if (!classes) {
                res.status(500).json({error: 'could not find' + req.params.courseid + ' course'});
            } else {
                var classid = req.body.ID;
                db.collection('classes').findOne({ID: classid}, function(err, data) {
                    if (err) {
                        res.status(500).json({error: 'server error', stack: err})
                    } else if (data) {
                        res.status(406).json({msg: 'classID already exists!'})
                    } else {
                        db.collection('classes').insertOne(
                            {
                                ID: classid,
                                Name: req.body.Name,
                                Description: req.body.Description || 'Description',
                                TemplateUrl: req.body.TemplateUrl || '<div>\nEnter content here\n</div>',
                                Interactive: req.body.Interactive || false,
                                Assert: req.body.Assert || [],
                                ScriptModels: req.body.ScriptModels || {Meta: {}, Scripts: []},
                                Dependencies: req.body.Dependencies || [],
                                ClassMethods: req.body.ClassMethods || [],
                                Active: req.body.Active || false,
                                CreatedBy: req.User.Identity
                            },
                            function (err, result) {
                                if (err) {
                                    res.status(500).json({
                                        error: 'could not create new class at this time',
                                        stack: err
                                    });
                                } else {
                                    db.collection('courses').updateOne({ID: req.params.courseid}, {"$push": {Classes: classid}}, function (err, data) {
                                        if (err || data.result.nModified == 0) {
                                            db.collection('classes').removeOne({ID: classid}, function (err, response) {
                                                if (err || data.result.nModified == 0) {
                                                    res.status(500).json({error: 'class created but not added to ' + req.params.courseid + ' class list'})
                                                } else {
                                                    res.status(500).json({error: 'class not added because it could not be added to ' + req.params.courseid + ' class list'})


                                                }
                                            })
                                        } else {
                                            res.status(204).send();
                                        }
                                    });
                                }
                            }
                        )
                    }
                })

            }
        });


    }

});
router.patch('/class/:classid', function (req, res) {
    //Patch Class
    if (!req.body) {
        res.status(401).json({error: "request body is required"})
    }
    else {
        var modObj = {};
        var oldKeys = [];
        db.collection('classes').findOne({ID: req.params.classid}, function (err, data) {
            if (err) {
                res.status(500).json({error: "system error", mongoError: err})
            } else if (!data) {
                res.status(404).json({error: req.params.classid + ' not found'})
            } else {
                for (var key in data) {
                    oldKeys.push(key);
                }
                for (var newKey in req.body) {
                    if (oldKeys.indexOf(newKey) > -1) {
                        modObj[newKey] = req.body[newKey];
                    }
                }

                db.collection('classes').updateOne({ID: req.params.classid}, {"$set": modObj}, function (err, data) {
                    if (err) {
                        res.status(500).json({error: 'class could not be updated'})
                    } else if (data.result.nModified == 0) {
                        res.status(404).json({error: req.params.classid + ' not found'})
                    } else {
                        res.status(204).send();
                    }
                })
            }
        });
    }
});

router.delete('/class/:classid/delete', function (req, res) {
    //Delete class and add to archive
    db.collection('courses').update({}, {"$pull": {Classes: req.params.classid}}, {multi: true}, function (err, data) {
        if (err) {
            res.status(500).json({error: 'could not remove class at this time'})
        } else {
            db.collection('classes').findOne({ID: req.params.classid}, {_id: 0}, function (err, data) {
                if (err) {
                    res.status(500).json({error: 'could not remove class at this time'})
                } else if (data) {
                    var d = new Date();
                    data.ModifiedOn = d;
                    data.UpdatedBy = req.User.Username;
                    db.collection('class_archive').insertOne(data, function (err, data) {
                        if (err) {
                            res.status(500).json({error: 'could not remove class at this time'})
                        } else {
                            db.collection('classes').removeOne({ID: req.params.classid}, function (err, data) {
                                if (err) {
                                    db.collection('class_archive').removeOne({ID: req.params.classid}, function (err, data) {
                                        if (err) {
                                            res.status(500).json({error: 'class not removed but still added to class archive'})
                                        }
                                    })
                                } else {
                                    res.status(204).send();
                                }
                            })
                        }
                    })
                } else {
                    res.status(404).json({error: 'class not found'})
                }
            })
        }
    })
});

router.post('/course/create', function (req, res) {
    //Create Course
    var fields = ['ID', 'CourseType', 'Name'];
    var errors = requireFields(fields, req.body);
    if (errors.length > 0) {
        res.status(406).json({error: 'Missing fields', stack: errors});
    } else if (req.body.CourseType == 'developer' || req.body.CourseType == 'business') {
        db.collection('courses').aggregate({"$group": {"_id": "$CourseType", "count": {"$sum": 1}}}, function(err, data) {
            if (err) {
                res.status(500).json({error: err})
            } else {
                var d = new Date();
                var d = d;
                var courseCount = Underscore.where(data, {_id: 'developer'})[0].count;
                db.collection('courses').insertOne(
                 {
                     ID: req.body.ID,
                     Name: req.body.Name,
                     CourseType: req.body.CourseType,
                     Description: req.body.Description || 'Description',
                     LongDescription: req.body.LongDescription || 'Long Description',
                     Difficulty: req.body.Difficulty || null,
                     Classes: req.body.Classes || [],
                     ImgUrl: req.body.ImgUrl || "assets/basics.png",
                     ListOrder: courseCount + 1,
                     Active: req.body.Active || false,
                     AdminHide: false,
                     CreatedBy: req.User.Username,
                     CreatedOn: d
                 },
                 function (err, response) {
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
            }
        })
    } else {
        res.status(406).json({error: "'CourseType' must be set to 'developer' or 'business'"})
    }

});
router.post('/course/:courseid/update', function (req, res) {
    //Update Course
    if (req.body.ID != req.params.courseid) {
        res.status(406).end('"ID" in request body must match "courseid" parameter value');
    } else {
        db.collection('courses').findOne({ID: req.params.courseid}, {_id: 0}, function (err, data) {
            if (err) {
                res.status(500).json({error: 'server error', stack: err})
            } else if (!data) {
                res.status(404).json({error: 'course not found'})
            } else {
                var d = new Date();
                data.ModifiedOn = d;
                data.UpdatedBy = req.User.Username;
                db.collection('course_archive').insertOne(data, function (err, result) {
                    if (err) {
                        res.status(500).json({error: 'could not update course at this time', stack: err})
                    } else if (result.result.nInserted == 0) {
                        res.status(500).json({error: 'could not make copy of class at this time'})
                    } else {
                        db.collection('courses').replaceOne(
                            {ID: req.params.courseid},
                            req.body,
                            function (err, response) {
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
                })
            }
        })

    }


});

router.patch('/course/:courseid', function (req, res) {
    //Patch Course
    if (!req.body) {
        res.status(401).json({error: "request body is required"})
    }
    else {
        var modObj = {};
        var oldKeys = [];
        db.collection('courses').findOne({ID: req.params.courseid}, function (err, data) {
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

                db.collection('courses').updateOne({ID: req.params.courseid}, {"$set": modObj}, function (err, data) {
                    if (err) {
                        res.status(500).json({error: 'course could not be updated'})
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

//DELETE COURSE currently not allowed
/*router.delete('course/:courseid/delete', function (req, res) {
    //Delete Course
    db.collection('courses').findOne({ID: req.params.courseid}, {_id: 0}, function (err, data) {
        if (err) {
            res.status(500).json({error: 'could not remove course at this time'})
        } else {
            db.collection('course_archive').insertOne(data, function (err, data) {
                if (err) {
                    res.status(500).json({error: 'could not remove class at this time'})
                } else {
                    db.collection('courses').removeOne({ID: req.params.courseid}, function (err, data) {
                        if (err) {
                            res.status(500).json({error: 'could not remove class at this time'})
                        } else {
                            res.status(204).send();
                        }
                    })
                }
            })
        }
    })
});*/

router.get('/checkIfIdExists/:courseid', function (req, res) {
    //Check if CourseID exists
    if (req.query.collection == 'courses' || req.query.collection == 'classes') {
        db.collection(req.query.collection).findOne({ID: req.params.courseid}, function (err, data) {
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