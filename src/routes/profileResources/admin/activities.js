var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../../libs/utils');

var mongoEntity = Mongoose.model('entity');
var mongoMaintenanceActivity = Mongoose.model('maintenanceActivity');
var mongoMaintenanceActivityAttention = Mongoose.model('maintenanceActivityAttention');

var DATE_FORMAT = 'DD/MM/YYYY';

exports.getActivitiesViewData = function (req, res, next) {
  if (!req.user) {
    console.log('No identifier found');
    res.redirect('/login');
  }

  if (req.user.role !== 'admin') {
    var message = 'Just for main administrators';
    throw new Error(message);
    return;
  }

  var companiesPromise = new Promise(function (resolve, reject) {
    var query = {type: 'company'};

    mongoEntity.find(query).exec()
    .then(function (companies) {
      resolve(companies);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var maintenanceActivitiesPromise = new Promise(function (resolve, reject) {
    var query = {};

    mongoMaintenanceActivity.find(query).populate('company').populate('equipmentType').exec()
    .then(function (maintenanceActivities) {
      resolve(maintenanceActivities);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var maintenanceActivityAttentionsPromise = new Promise(function (resolve, reject) {
    var query = {};

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
        
      resolve(arrMaintenanceActivityAttentions);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var onRender = function (data) {
    var tempUser = req.user;
    req.user = {};
    return res.render('pages/maintenance_activity/maintenance_activity_admin', {
      user: tempUser,
      companies: data[0],
      maintenanceActivities: data[1],
      maintenanceActivityAttentions: data[2]
    });
  };

  Promise.all([companiesPromise, maintenanceActivitiesPromise, maintenanceActivityAttentionsPromise])
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
};
