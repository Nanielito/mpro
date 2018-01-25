var Express = require('express');
var Sanitizer = require('sanitizer');
var Mongoose = require('mongoose');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');
var ObjectId = require('mongoose').Types.ObjectId; 

var Activities = require('./profileResources/technician/activities');
var Equipments = require('./profileResources/technician/equipments');

var router = Express.Router();
var csrfProtection = Csrf({cookie: true});
var mongoAccount = Mongoose.model('account');
var mongoEquipmentType = Mongoose.model('equipmentType');
var mongoEquipment = Mongoose.model('equipment');

router.use(function (req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  req.body = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.body))));
  req.params = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.params))));
  req.query = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.query))));
  next();
});

router.get('/technician/:identifier', function (req, res, next) { 
  if (!req.user) {
    req.session.loginPath = null;
    console.log('No identifier');
    res.redirect('/login');
  }

  var populateAccountCompanyPromise = function (account) {
    var promise = new Promise(function (resolve, reject) {
      mongoAccount.populate(account, {path: 'company.company', model: 'entity'}, function (err, account) {
        if (err) {
          reject(err);
        }
        else {
          resolve(account);
        }
      });
    });

    return promise;
  };

  var accountPromise = new Promise(function (resolve, reject) {
    var identifier = req.params.identifier || req.user.identifier;
    var role = req.params.role || req.user.role;
    var query = {'identifier': identifier, 'role': role};

    mongoAccount.findOne(query).populate('company').exec()
    .then(function (user) {    
      if (!user || user.length === 0) {
        var message = 'No user found';
        reject(new Error(message));
      }
      else {
        var promise = populateAccountCompanyPromise(user);

        promise
        .then(function (account) {
          resolve(account);
        })
        .catch(function (err) {
          reject(err);
        });
      }
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var onRender = function (data) {
    return res.render('pages/dashboard/dashboard_technician', {
      user: req.user || {},
      currentAccount: data
    });
  };
  
  accountPromise
  .then(onRender)
  .catch(function (err) {
    console.log('Error:', err);
    res.redirect('/');
    return;
  });
});

router.get('/technician/:identifier/activities', Activities.getActivitiesViewData);

router.get('/technician/:identifier/equipments', Equipments.getEquipmentsViewData);

module.exports = router;
