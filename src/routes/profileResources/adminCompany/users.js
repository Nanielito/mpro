var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../../libs/utils');

var mongoAccount = Mongoose.model('account');
var mongoEntity = Mongoose.model('entity');

var DATE_FORMAT = 'DD/MM/YYYY';

exports.getUsersViewData = function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('No identifier');
    res.redirect('/login');
  }

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
        resolve(user);
      }
    })
    .catch(function (err) {
      reject(err);
    });
  });
  
  var onFetchBranchCompanies = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query = {type: 'branchCompany', company: user.company._id} 
    
      mongoEntity.find(query).exec()
      .then(function (branchCompanies) {
        resolve([user, branchCompanies]);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onFetchAccounts = function (data) {
    var branchCompanyIds = Functional.reduce(data[1], function(accumulator, branchCompany) {
      accumulator.push(branchCompany._id);

      return accumulator;
    }, []);     

    var promise = new Promise(function (resolve, reject) {
      var query = {company: {$in: branchCompanyIds}};

      mongoAccount.find(query).populate('company').lean().exec()
      .then(function (accounts) {
        accounts = Functional.map(accounts, function (account) {
          account.date = Utils.formatDate(account.date, DATE_FORMAT);
          account.roleValue = mongoAccount.getRoleValue(account.role);
          return account;
        });

        data.push(accounts);
        resolve(data);
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
      if (roleEnumValue.id !== 'admin' && roleEnumValue.id !== 'adminCompany') {
        accumulator.push(roleEnumValue);
      }

      return accumulator;
    }, []);
    var tempUser = req.user || {};
    req.user = {};

    return res.render('pages/account/account_admin_company', {
      user: tempUser,
      currentAccount: data[0],
      branchCompanies: data[1],
      accounts: data[2],
      roles: roles
    });
  };

  accountPromise
  .then(onFetchBranchCompanies)
  .then(onFetchAccounts)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
}