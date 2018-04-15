var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../../libs/utils');

var mongoAccount = Mongoose.model('account');
var mongoEquipmentType = Mongoose.model('equipmentType');
var mongoEquipment = Mongoose.model('equipment');
var mongoMaintenanceActivity = Mongoose.model('maintenanceActivity');
var mongoMaintenanceActivityAttention = Mongoose.model('maintenanceActivityAttention');

var DATE_FORMAT = 'DD/MM/YYYY';

exports.getActivitiesViewData = function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('No identifier found');
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

  var onFetchEquipments = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query = {branchCompany: user.company._id};

      mongoEquipment.find(query).populate('equipmentType').exec()
      .then(function (equipments) {
        resolve([user, equipments]);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onFetchEquipmentTypes = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var equipmentTypes = Functional.reduce(data[1], function (accumulator, equipment) {
        if (accumulator[equipment.equipmentType._id] === undefined) {
          accumulator[equipment.equipmentType._id] = equipment.equipmentType;
        }

        return accumulator;
      }, {});

      equipmentTypes = Functional.reduce(Object.keys(equipmentTypes), function (accumulator, key) {
        accumulator.push(equipmentTypes[key]);
        
        return accumulator;
      }, []);

      data.push(equipmentTypes);

      resolve(data);
    });

    return promise;
  };

  var onFetchMaintenanceActivityAttentions = function (data) {
    var equipmentIds = Functional.reduce(data[1], function (accumulator, equipment) {
      accumulator.push(equipment._id);

      return accumulator;
    }, []);

    var promise = new Promise(function (resolve, reject) {
      var query = {equipment: {$in: equipmentIds}};

      mongoMaintenanceActivityAttention.find(query).populate('maintenanceActivity').populate('equipment').lean().exec()
      .then(function (maintenanceActivityAttentions) {
        var maintenanceActivityAttentions = Functional.map(maintenanceActivityAttentions, function (maintenanceActivityAttention) {
          maintenanceActivityAttention.date = Utils.formatDate(maintenanceActivityAttention.date.toString(), DATE_FORMAT);
          
          return maintenanceActivityAttention;
        });

        data.push(maintenanceActivityAttentions);

        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  }

  var onRender = function (data) {
    var tempUser = req.user || {};
    req.user = {};

    return res.render('pages/maintenance_activity/maintenance_activity_technician', {
      user: tempUser,
      currentAccount: data[0],
      equipments: data[1],
      equipmentTypes: data[2],
      maintenanceActivityAttentions: data[3]
    });
  };

  accountPromise
  .then(onFetchEquipments)
  .then(onFetchEquipmentTypes)
  .then(onFetchMaintenanceActivityAttentions)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
};