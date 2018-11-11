var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../libs/utils');
var Log = require('../../libs/log');

var mongoEquipment = Mongoose.model('equipment');

/* ########################################################################## */
/* CREATE RESOURCES                                                           */
/* ########################################################################## */

exports.createEquipment = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var saveEquipmentPromise = new Promise(function (resolve, reject) {
    var equipment = {
      name         : req.body.name,
      code         : req.body.code,
      location     : req.body.location,
      branchCompany: req.body.branchCompany,
      equipmentType: req.body.equipmentType,
      userAssigned : req.body.account
    };

    var onCreateDocument = function (err, document) {
      if (err) {
        Log.error({
          parameters: ['EQUIPMENT_EXCEPTION', err],
          //text      : 'Exception! '.concat(err),
          type      : 'create_equipment',
          user      : req.user._id,
          model     : err
        });

        reject({error: true, code: 500, message: err.message});
      };

      Log.debug({
        parameters: ['EQUIPMENT_CREATE_SUCCESS', req.user.name, document.name],
        //text      : 'Success on create! '.concat('User ', req.user.name, ' creates equipment ', document.name),
        type      : 'create_equipment',
        user      : req.user._id,
        model     : document
      });

      resolve({error: false, data: document});
    };

    var newEquipment = new mongoEquipment(equipment);

    newEquipment.save(onCreateDocument);
  });

  var onFinish = function (data) {
    res.status(200).send(data);
  };

  saveEquipmentPromise
  .then(onFinish)
  .catch(function (err) {
    res.status(err.code).send(err.message);
  });
};

/* ########################################################################## */
/* READ RESOURCES                                                             */
/* ########################################################################## */

exports.getEquipments = function (req, res, next) {
  /*if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }*/

  var page = parseInt(req.params.page) || 0;
  var quantity = parseInt(req.params.quantity) || 0;
  var query = {};

  if (typeof req.params.search !== 'undefined' && req.params.search != 'all') {
    var searchPattern = req.params.search;

    query = {$or: [{name: new RegExp(searchPattern, 'i')}, {code: searchPattern}, {location: searchPattern}]};
  }

  mongoEquipment.find(query)
  .populate({
    path:'branchCompany',
    model:'entity',
    populate:{
      path:'company',
      model:'entity'
    }
  })
  .populate('equipmentType')
  .skip(page * quantity).limit(page).exec()
  .then(function (equipments) {
    res.status(200).send({error: false, data: equipments});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: 'Unexpected error was occurred'});
  });
};

exports.getEquipment = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.equipment};

  mongoEquipment.findOne(query).populate('branchCompany').exec()
  .then(function (equipment) {
    console.log(JSON.stringify(equipment))
    res.status(200).send({error: false, data: equipment});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: 'Unexpected error was occurred'});
  });
};

exports.getEquipmentsByEquipmentType = function (req, res, next) {
  var equipmentsPromise = new Promise(function (resolve, reject) {
    var query = {equipmentType: req.params.equipmentType};
    var projection = {_id: 1, name: 1};

    mongoEquipment.find(query, projection).exec()
    .then(function (equipments) {
      resolve(equipments);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  equipmentsPromise
  .then(function (equipments) {
    res.status(200).send({error: false, data: equipments});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: err.message});
  });
};

/* ########################################################################## */
/* UPDATE RESOURCES                                                           */
/* ########################################################################## */

exports.updateEquipment = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.equipment};	
  var option = {new: true};
  var setValues = {};

  if (typeof req.body.name !== 'undefined') {
    setValues['name'] = req.body.name;
  }

  if (typeof req.body.code !== 'undefined') {
    setValues['code'] = req.body.code;
  }

  if (typeof req.body.location !== 'undefined') {
    setValues['location'] = req.body.location;
  }

  if (typeof req.body.branchCompany !== 'undefined') {
    setValues['branchCompany'] = req.body.branchCompany;
  }

  if (typeof req.body.equipmentType !== 'undefined') {
    setValues['equipmentType'] = req.body.equipmentType;
  }

  if (typeof req.body.status !== 'undefined') {
    setValues['status'] = req.body.status;
  }

  if (typeof req.body.deleted !== 'undefined') {
    setValues['deleted'] = req.body.deleted;
  }

  if (typeof req.body.account !== 'undefined') {
    setValues['userAssigned'] = req.body.account;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      Log.error({
        parameters: ['EQUIPMENT_EXCEPTION', err],
        //text      : 'Exception! '.concat(err),
        type      : 'update_equipment',
        user      : req.user._id,
        model     : err
      });

      res.status(500).send({error: true, message: 'Unexpected error was occurred'});
    }
    
    if (!document) {
      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    Log.debug({
      parameters: ['EQUIPMENT_UPDATE_SUCCESS', req.user.name, document.name],
      //text      : 'Success on update! '.concat('User ', req.user.name, ' updates equipment ', document.name),
      type      : 'update_equipmentType',
      user      : req.user._id,
      model     : document
    });

    res.status(200).send({error: false, data: document});
  };
		
  mongoEquipment.findOneAndUpdate(query, {$set: setValues}, option, onUpdateDocument);
};

exports.updateMaintenanceActivityDate = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {'maintenanceActivityDates._id': req.params.maintenanceActivityDate};
  var option = {upsert: false};
  var setValues = {};

  if (typeof req.body.started !== 'undefined') {
    setValues['started'] = req.body.started;
  }

  if (typeof req.body.finished !== 'undefined') {
    setValues['finished'] = req.body.finished;
    setValues['finishedDate'] = Date.now();
  }

  if (typeof req.body.comment !== 'undefined') {
    setValues['comment'] = req.body.comment;
  }

  var transformValues = function (values) {
    var newValues = Functional.reduce(
      Object.keys(values), 
      function (accumulator, key) {
        accumulator['maintenanceActivityDates.$.'.concat(key)] = values[key];
        return accumulator;
      }, 
      {});

      return newValues;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      Log.error({
        parameters: ['EQUIPMENT_EXCEPTION', err],
        //text      : 'Exception! '.concat(err),
        type      : 'update_equipment',
        user      : req.user._id,
        model     : err
      });

      res.status(500).send({error: true, message: 'Unexpected error was occurred'});
    }

    if (document.nModified === 0) {
      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    Log.debug({
      parameters: ['EQUIPMENT_UPDATE_SUCCESS', req.user.name, document.name],
      //text      : 'Success on update! '.concat('User ', req.user.name, ' updates equipment ', document.name),
      type      : 'update_equipment',
      user      : req.user._id,
      model     : document
    });

    res.status(200).send({error: false, data: document}); // This document contains information related to update process status.
  }

  mongoEquipment.update(query, {$set: transformValues(setValues)}, option, onUpdateDocument);
};

/* ########################################################################## */
/* DELETE RESOURCES                                                           */
/* ########################################################################## */
