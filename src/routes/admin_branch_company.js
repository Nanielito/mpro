var Express = require('express');
var Sanitizer = require('sanitizer');
var Mongoose = require('mongoose');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');

var Log = require('../libs/log');
var SessionHandle = require('../libs/sessionHandle');

var Activities = require('./profileResources/adminBranchCompany/activities');
var Users = require('./profileResources/adminBranchCompany/users');
var Equipments = require('./profileResources/adminBranchCompany/equipments');

var router = Express.Router();
var csrfProtection = Csrf({cookie: true});
var mongoAccount = Mongoose.model('account');

router.use(function (req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  req.body = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.body))));
  req.params = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.params))));
  req.query = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.query))));
  next();
});

router.get('/adminBranchCompany', SessionHandle.isLogged, function (req, res, next) {
  if (!req.user) {
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
    var username = req.user.username;
    var query = {'identifier': identifier, 'role': role, username: username};
    
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

  var onFetchActivities = function (user) {
    var promise = new Promise(function (resolve, reject) {
      Log.getLogs(1000,0).onFetchByRole(user)
      .then(function (data) {
        resolve({user: user, activities: data});
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };
  
  var onRender = function (data) {
    var tempUser = req.user || {};
    req.user = {};
    console.log(tempUser)
    return res.render('pages/dashboard/dashboard_admin_branch_company', {
      user: tempUser,
      currentAccount: data.user,
      activities: data.activities
    });
  };

  accountPromise
  .then(onFetchActivities)
  .then(onRender)
  .catch(function (err) {
    console.log('Error:', err);
    res.redirect('/');
    return;
  });
});


router.get('/adminBranchCompany/activities', SessionHandle.isLogged, Activities.getActivitiesViewData);

router.get('/adminBranchCompany/users', SessionHandle.isLogged, Users.getUsersViewData);

router.get('/adminBranchCompany/equipments', SessionHandle.isLogged, Equipments.getEquipmentsViewData);

module.exports = router;
