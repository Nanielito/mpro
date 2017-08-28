var Express = require('express');
var Sanitizer = require('sanitizer');
var Mongoose = require('mongoose');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');
var ObjectId = require('mongoose').Types.ObjectId; 
var Functional = require('underscore');

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

router.get('/admin_branch_company/:identifier', function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('no identifier');
    res.redirect('/login');
  }

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
        resolve(user);
      }
    })
    .catch(function (err) {
      reject(err);
    });
  });
  
  var onRender = function (data) {
    return res.render('pages/dashboard/dashboard_admin_branch_company', {
      user: req.user || {},
      //csrfToken: req.csrfToken()
      currentAccount: currentAccount      
    });
  };

  accountPromise
  .then(onRender)
  .catch(function (err) {
    console.log('error:', err);
    res.redirect('/');
    return;
  });
});

router.get('/admin_branch_company/:identifier/users', function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('no identifier');
    res.redirect('/login');
  }

  var populateAccountCompanyPromise = function (account, role) {
    var promise = new Promise(function (resolve, reject) {
      if (account.role === role) {
        mongoAccount.populate(account, {path: 'company.company', model: 'entity'}, function (err, account) {
          if (err) {
            reject(err);
          }
          else {
            resolve(account);
          }
        });
      }
      else {
        resolve(account);
      }
    });

    return promise;
  };

  var accountPromise = new Promise(function (resolve, reject) {
    var identifier = req.params.identifier || req.user.identifier;
    var role = req.params.role || req.user.role;
    var query = {'identifier': identifier, 'role': role};
  
    mongoAccount.findOne(query).populate('company').exec()
    .then(function (user) {
      if (!user || user.length == 0) {
        var message = 'No user found';
        reject(new Error(message));
      }
      else {
        var promise = populateAccountCompanyPromise(user, 'admin_branch_company');

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

  var onFetchAccounts = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query = {role: 'technical', company: new ObjectId(user.company._id)};

      mongoAccount.find(query).populate('company').exec()
      .then(function (users) {
        var accounts = users;
        var promises = Functional.reduce(accounts, function (accumulator, account) {
          var promise = populateAccountCompanyPromise(account, 'technical');

          accumulator.push(promise);

          return accumulator;
        }, []);

        Promise.all(promises)
        .then(function (accounts) {
          resolve([user, accounts]);
        })
        .catch(function (err) {
          reject(err);
        });
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onRender = function (data) {
    var roleEnumValues = mongoAccount.schema.path('role').enumValues;
    var roles = Functional.filter(roleEnumValues, function (roleEnumValue) {
      return roleEnumValue !== 'admin' && roleEnumValue !== 'admin_company' && roleEnumValue !== 'admin_branch_company';
    });

    return res.render('pages/account/account_admin_branch_company', {
      user: req.user || {},
      currentAccount: data[0],
      companies: [],
      branchCompanies: [],
      accounts: data[1],
      roles: roles
    });
  };
  
  accountPromise
  .then(onFetchAccounts)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
});

module.exports = router;
