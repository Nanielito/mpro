var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../../libs/utils');

var mongoAccount = Mongoose.model('account');

var DATE_FORMAT = 'DD/MM/YYYY';

exports.getUsersViewData = function (req, res, next) {
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
    var identifier = req.user.identifier;
    var role = req.params.role || req.user.role;
    var username = req.user.username;
    var query = {'identifier': identifier, 'role': role, username: username};
  
    mongoAccount.findOne(query).populate('company').exec()
    .then(function (user) {
      if (!user || user.length == 0) {
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

  var onFetchAccounts = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query = {role: 'technician', company: user.company._id};

      mongoAccount.find(query).populate('company').lean().exec()
      .then(function (accounts) {
        accounts = Functional.map(accounts, function (account) {
          account.date = Utils.formatDate(account.date, DATE_FORMAT);
          account.roleValue = mongoAccount.getRoleValue(account.role);
          return account;
        });

        resolve([user, accounts]);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onRender = function (data) {
    var roleEnumValues = mongoAccount.getRoleValues();
    var roles = Functional.reduce(roleEnumValues, function (accumulator, roleEnumValue) {      
      if (roleEnumValue.id !== 'admin' && roleEnumValue.id !== 'adminCompany' && roleEnumValue.id !== 'adminBranchCompany') {
        accumulator.push(roleEnumValue);
      }

      return accumulator;
    }, []);

    var tempUser = req.user || {};
    req.user = {};    
    return res.render('pages/account/account_admin_branch_company', {
      user: tempUser,
      currentAccount: data[0],
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
}