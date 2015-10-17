var express = require('express');
var router = express.Router();
var Underscore = require('underscore');
var Chance = require('chance');

var chance = new Chance();


function verifyKeys(key, errors) {

}

router.get('/', function(req, res) {
  //Get User
  db.collection('users').findOne({Identity: req.User.Identity}, {Identity: 0, _id: 0}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not process request', error: err});
    } else {
      res.status(200).json(data);
    }
  })
});

router.post('/oc-vars', function(req, res) {
  //Save OC Variable
  if (!req.body) {
    res.status(406).json({error: 'request body is required'})
  } else if (!req.body.key) {
    res.status(406).json({error: "must provided 'key' in request body"});
  } else if (!req.body.val) {
    res.status(406).json({error: "must provided 'val' in request body"});
  }
  else
   {

    db.collection('users').updateOne({Identity: req.User.Identity}, {"$push": {"Courses.OcVars": {key: req.body.key, val: req.body.val, hash: chance.hash({length: 15})}}}, function(err, data) {
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
  db.collection('users').findOne({Identity: req.User.Identity}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not get variables', error: err})
    } else {
      res.status(200).json(data.Courses.OcVars);
    }
  })
});

router.delete('/oc-vars/:hash', function(req, res) {
  //Delete OC Variable
  db.collection('users').updateOne({Identity: req.User.Identity}, {"$pull": {"Courses.OcVars": {"hash": req.params.hash}}}, function(err, data) {
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
      db.collection('users').updateOne({Identity: req.User.Identity, "Courses.OcVars.hash": req.params.hash}, {"$set": updateVals}, function(err, data) {
        if (err) {
          res.status(406).json({msg: 'Cannot update object at this time', error: err});
        } else if (data.result.nModified == 0) {
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
      db.collection('users').updateOne({Identity: req.User.Identity}, {"$addToSet": {"Courses.Progress.Classes": req.params.classid}}, function(err, data) {
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
});

module.exports = router;
