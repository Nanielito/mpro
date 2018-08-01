var Mongoose = require('mongoose');

var mongoAccount = Mongoose.model('account');
var mongoEntity = Mongoose.model('entity');

exports.getCompaniesViewData = function (req, res, next) {
  if (!req.user) {
    console.log('No identifier');
    res.redirect('/login');
  }

  if (req.user.role !== 'adminCompany') {
    var message = 'Just for main administrators';
    throw new Error(message);
    return;
  }

  var accountPromise = new Promise(function (resolve, reject) {
    var identifier = req.params.identifier || req.user.identifier;
    var role = req.params.role || req.user.role;
    var username = req.user.username;
    var query = {'identifier': identifier, 'role': role, username: username};
  
    mongoAccount.findOne(query)
    .populate({
      path:'company',
      model:'entity',
      populate:{
        path:'company',
        model:'entity'
      }
    }).exec()
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
      var query = {type: 'branchCompany', company: user.company._id};

      mongoEntity.find(query)
      .populate({
        path:'company',
        model:'entity',
        populate:{
          path:'company',
          model:'entity'
        }
      }).exec()
      .then(function (branchCompanies) {
        resolve([user, branchCompanies]);
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

    return res.render('pages/company/company_admin_company', {
      user: tempUser,
      currentAccount: data[0],
      branchCompanies: data[1]
    });
  };

  accountPromise
  .then(onFetchBranchCompanies)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
}