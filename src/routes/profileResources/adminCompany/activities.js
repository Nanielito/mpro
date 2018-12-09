var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../../libs/utils');

var mongoAccount = Mongoose.model('account');
var mongoEquipmentType = Mongoose.model('equipmentType');
var mongoMaintenanceActivity = Mongoose.model('maintenanceActivity');
var mongoMaintenanceActivityAttention = Mongoose.model('maintenanceActivityAttention');

var DATE_FORMAT = 'DD/MM/YYYY';

exports.getActivitiesViewData = function (req, res, next) {
  if (!req.user) {
    console.log('No identifier found');
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

  var onFetchEquipmentTypes = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query = {company: user.company._id};

      mongoEquipmentType.find(query).exec()
      .then(function (equipmentTypes) {
        resolve([user, equipmentTypes]);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onFetchMaintenanceActivities = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var query = {company: data[0].company._id};

      mongoMaintenanceActivity.find(query).populate('equipmentType').exec()
      .then(function (maintenanceActivities) {
        data.push(maintenanceActivities);
        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onFetchMaintenanceActivityAttentions = function (data) {
    var maintenanceActivityIds = Functional.reduce(data[2], function (accumulator, maintenanceActivity) {
      accumulator.push(maintenanceActivity._id);
      return accumulator;
    }, []);

    var promise = new Promise(function (resolve, reject) {
      var query = {maintenanceActivity: {$in: maintenanceActivityIds}};

      mongoMaintenanceActivityAttention.find(query).populate('maintenanceActivity').populate('equipment').lean().exec()
      .then(function (maintenanceActivityAttentions) {
        var arrMaintenanceActivityAttentions=[];

        Functional.forEach(maintenanceActivityAttentions, function(element, i) {
          element.date = Utils.formatDate(element.date.toString(), DATE_FORMAT);
          element.equipment.date  = Utils.formatDate(element.equipment.date.toString(), DATE_FORMAT);
            var exist = Functional.filter(arrMaintenanceActivityAttentions, function(o) { return o._id == element.equipment._id && o.date == element.equipment.date; });
            if(exist.length==0) {
                element.equipment['attentions']=[];
                arrMaintenanceActivityAttentions.push(element.equipment);
            }
            arrMaintenanceActivityAttentions[arrMaintenanceActivityAttentions.length-1].attentions.push(element);
        });

        data.push(arrMaintenanceActivityAttentions);

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
   
    return res.render('pages/maintenance_activity/maintenance_activity_admin_company', {
      user: tempUser,
      currentAccount: data[0],
      equipmentTypes: data[1],
      maintenanceActivities: data[2],
      maintenanceActivityAttentions: data[3]
    });
  };

  accountPromise
  .then(onFetchEquipmentTypes)
  .then(onFetchMaintenanceActivities)
  .then(onFetchMaintenanceActivityAttentions)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
};
