var express = require('express');
var router = express.Router();
var Underscore = require('underscore');
var Chance = require('chance');

var chance = new Chance();


router.use(function(req, res, next) {
  if (req.AccessGranted) {
    next();
  } else {
    res.status(403).json({error: 'Access has been denied for this request'})
  }
});

router.get('/', function(req, res) {
  //Get User
  db.collection(req.UserEnv).findOne({Identity: req.User.Identity}, {Identity: 0, _id: 0}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not process request', error: err});
    } else {
      res.status(200).json(data);
    }
  })
});

router.post('/oc-vars', function(req, res) {
  //Save OC Variable
  if (Underscore.isEmpty(req.body)) {
    res.status(406).json({error: 'request body is required'})
  } else if (!req.body.key) {
    res.status(406).json({error: "must provided 'key' in request body"});
  } else if (!req.body.val) {
    res.status(406).json({error: "must provided 'val' in request body"});
  }
  else
   {

    db.collection(req.UserEnv).updateOne({Identity: req.User.Identity}, {"$push": {"Courses.OcVars": {key: req.body.key, val: req.body.val, hash: chance.hash({length: 15})}}}, function(err, data) {
      if (err) {
        res.status(500).json({msg: 'could not add value', error: err});
      } else if (data.result.nModified == 0){
        res.status(404).json({error: 'Could not find user'})
      } else {
        res.status(204).send();
      }

    })
  }
});

router.get('/oc-vars', function(req, res) {
  //Get OC Variable
  db.collection(req.UserEnv).findOne({Identity: req.User.Identity}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not get variables', error: err})
    } else if (!data) {
      res.status(404).json({msg: 'User Not Found'});
    }
    else
     {
       if (data.Courses && data.Courses.OcVars) {
           res.status(200).json(data.Courses.OcVars);
       } else {
         db.collection(req.UserEnv).updateOne({Identity: req.User.Identity}, {"$set": {"Courses.OcVars": []}}, function(err, data) {
           if (err) {
             res.status(500).json({error: err})
           } else if (data.result.nModified == 0) {
             res.status(404).json({error: 'user not found'})
           } else {
             res.status(200).json([]);
           }

         })
       }

    }
  })
});

router.delete('/oc-vars/:hash', function(req, res) {
  //Delete OC Variable
  db.collection(req.UserEnv).updateOne({Identity: req.User.Identity}, {"$pull": {"Courses.OcVars": {"hash": req.params.hash}}}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'could not delete', error: err});
    } else if (data.result.nModified == 0){
      res.status(404).json({error: 'Could not delete'})
    } else {
      res.status(204).send();
    }
  })
});

router.patch('/oc-vars/:hash', function(req, res) {
  //Update OC Variable
  if (!req.body) {
    res.status(406).json({error: 'request body is required'});
  } else {
    var updateVals = {};
    if (req.body.key && req.body.val) {
      updateVals = {"Courses.OcVars.$.key": req.body.key, "Courses.OcVars.$.val": req.body.val};
    } else if (req.body.key && !req.body.val) {
      updateVals = {"Courses.OcVars.$.key": req.body.key};
    } else if (!req.body.key && req.body.val) {
      updateVals = {"Courses.OcVars.$.val": req.body.val};
    }
    if (Underscore.isEmpty(updateVals)) {
      res.status(406).json({error: "Must provided either 'key' or 'val' in request body to update"})
    } else {
      db.collection(req.UserEnv).updateOne({Identity: req.User.Identity, "Courses.OcVars.hash": req.params.hash}, {"$set": updateVals}, function(err, data) {
        if (err) {
          res.status(406).json({msg: 'Cannot update object at this time', error: err});
        } else if (data.result.n == 0) {
          res.status(406).json({error: 'Variable could not be found'});
        } else {
          res.status(204).send();
        }
      })
    }

  }
});

router.post('/progress/:classid', function(req, res) {
  //Save Class Progress
  db.collection('classes').findOne({ID: req.params.classid}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'could not access class in db', error: err})
    } else if (!data) {
      res.status(404).json({error: req.params.classid + " class does not exist"});
    } else {
      db.collection(req.UserEnv).updateOne({Identity: req.User.Identity}, {"$addToSet": {"Courses.Progress.Classes": req.params.classid}}, function(err, data) {
        if (err) {
          res.status(500).json({msg: 'could not add classid to user object', error: err});
        } else if (data.result.nModified == 0) {
          res.status(204).send();
        } else {
          res.status(204).send();
        }
      })
    }
  })
});


router.get('/progress/courses/:courseid', function(req, res) {
  //Get Course Progress
  db.collection('courses').findOne({ID: req.params.courseid}, {_id: 0, Classes: 1}, function(err, course) {
    if (err) {
      res.status(500).json({error: 'Could not process request at this time'});
    } else if (!course) {
      res.status(404).json({error: 'Could not find course'});
    } else {
      var returnData = {};
      returnData.Meta = {};
      returnData.CompletedClasses = [];
      var completed = 0;
      db.collection(req.UserEnv).findOne({Identity: req.User.Identity}, function(err, user) {
        if (err) {
          res.status(500).json({error: 'Could not process request at this time'});
        } else if (!user) {
          res.status(404).json({errror: "Could not find user"})
        } else {
          if (user.Courses && user.Courses.Progress && user.Courses.Progress.Classes) {
            course.Classes.forEach(function(classid) {
              if (user.Courses.Progress.Classes.indexOf(classid) > -1) {
                returnData.CompletedClasses.push(classid);
                completed += 1;
              }
            });
            returnData.Meta.Count = completed;
            returnData.Meta.TotalClasses = course.Classes.length;
            returnData.Meta.PercentDone = completed / course.Classes.length;
            returnData.Meta.PercentDone = returnData.Meta.PercentDone.toFixed(2);
            res.status(200).json(returnData);
          } else {
            db.collection(req.UserEnv).updateOne({Identity: user.Identity}, {"$set": {"Courses.Progress.Classes": []}}, function(err, data) {
              if (err) {
                res.status(500).json({error: err});
              } else if (data.result.nModified == 0) {
                res.status(404).json({error: 'user not found'})
              } else {
                res.status(200).json({Meta: {Count: 0, TotalClasses: course.Classes.length, PercentDone: 0}, CompletedClasses: []})
              }
            })
          }


        }
      });
    }
  })
});

router.post('/saved-states/context', function(req, res) {
  //set ClientID State
  if (!req.body) {
    res.status(406).json({msg: 'must provide request body'})
  } else {
    db.collection(req.UserEnv).updateOne({Identity: req.User.Identity}, {"$set": {"Courses.State.Context": req.body}}, function(err, data) {
      if (err) {
        res.status(500).json({msg: 'could not set Context at this time', error: err})
      }else {
        res.status(204).send();
      }
    })
  }
});

router.get('/saved-states/context', function(req, res) {
  //set ClientID State
  db.collection(req.UserEnv).findOne({Identity: req.User.Identity}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'could not find Context at this time', error: err})
    } else if (!data) {
      res.status(404).json({msg: 'could not find user'})
    } else {
      if (data.Courses && data.Courses.State && data.Courses.State.Context) {
        res.status(200).json(data.Courses.State.Context);
      } else {
        res.status(200).json({});
      }

    }
  })
});

module.exports = router;
