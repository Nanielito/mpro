var Mongoose = require('mongoose');

var Log = require('../../libs/log');

var mongoEquipmentType = Mongoose.model('equipmentType');

/* ########################################################################## */
/* CREATE RESOURCES                                                           */
/* ########################################################################## */

exports.createEquipmentType = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var saveEquipmentTypePromise = new Promise(function (resolve, reject) {
    var equipmentType = {
      name       : req.body.name,
      description: req.body.description,
      company    : req.body.company
    };
  
    var onCreateDocument = function (err, document) {        
      if (err) {
        Log.error({
          parameters: ['EQUIPMENT_TYPE_EXCEPTION', err],
          //text      : 'Exception! '.concat(err),
          type      : 'create_equipmentType',
          user      : req.user._id,
          model     : err
        });

        reject({error: true, code: 500, message: err.message});
      };

      Log.debug({
        parameters: ['EQUIPMENT_TYPE_CREATE_SUCCESS', req.user.name, document.name],
        //text      : 'Success on create! '.concat('User ', req.user.name, ' creates equipment type ', document.name),
        type      : 'create_equipmentType',
        user      : req.user._id,
        model     : document
      });

      resolve({error: false, data: document});
    };
  
    var newEquipmentType = new mongoEquipmentType(equipmentType);

    newEquipmentType.save(onCreateDocument);
  });

  var onFinish = function (data) {
    res.status(200).send(data);
  };

  saveEquipmentTypePromise
  .then(onFinish)
  .catch(function (err) {
    res.status(err.code).send(err.message);
  });
};

/* ########################################################################## */
/* READ RESOURCES                                                             */
/* ########################################################################## */

exports.getEquipmentTypes = function (req, res, next) {
  /*if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }*/

  var page = parseInt(req.params.page) || 0;
  var quantity = parseInt(req.params.quantity) || 0;
  var query = {};

  if (typeof req.params.search !== 'undefined' && req.params.search != 'all') {
    var searchPattern = req.params.search;

    query = {$or: [{name: new RegExp(searchPattern, 'i')}, {description: searchPattern}]};
  }

  mongoEquipmentType.find(query).populate('company').skip(page * quantity).limit(page).exec()
  .then(function (equipmentTypes) {
    res.status(200).send({error: false, data: equipmentTypes});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: 'Unexpected error was occurred'});
  });
};

exports.getEquipmentType = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.equipmentType};

  mongoEquipmentType.findOne(query).populate('company').exec()
  .then(function (equipmentType) {
    res.status(200).send({error: false, data: equipmentType});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: 'Unexpected error was occurred'});
  });
};

exports.getEquipmentTypesByCompany = function (req, res, next) {
  var equipmentTypesPromise = new Promise(function (resolve, reject) {
    var query = {company: req.params.company};
    var projection = {_id: 1, name: 1};

    mongoEquipmentType.find(query, projection).exec()
    .then(function (equipmentTypes) {
      resolve(equipmentTypes);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  equipmentTypesPromise
  .then(function (equipmentTypes) {
    res.status(200).send({error: false, data: equipmentTypes});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: err.message});
  });
}

/* ########################################################################## */
/* UPDATE RESOURCES                                                           */
/* ########################################################################## */

exports.updateEquipmentType = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.equipmentType};			
  var option = {new: true};
  var setValues = {};

  if (typeof req.body.name !== 'undefined') {
    setValues['name'] = req.body.name;
  }

  if (typeof req.body.description !== 'undefined') {
    setValues['description'] = req.body.description;
  }

  if (typeof req.body.company !== 'undefined') {
    setValues['company'] = req.body.company;
  }

  if (typeof req.body.status !== 'undefined') {
    setValues['status'] = req.body.status;
  }

  if (typeof req.body.deleted !== 'undefined') {
    setValues['deleted'] = req.body.deleted;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      Log.error({
        parameters: ['EQUIPMENT_TYPE_EXCEPTION', err],
        //text      : 'Exception! '.concat(err),
        type      : 'update_equipmentType',
        user      : req.user._id,
        model     : err
      });

      res.status(500).send({error: true, message: 'Unexpected error was occurred'});
    }
    
    if (!document) {
      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    Log.debug({
      parameters: ['EQUIPMENT_TYPE_UPDATE_SUCCESS', req.user.name, document.name],
      //text      : 'Success on update! '.concat('User ', req.user.name, ' updates equipment type ', document.name),
      type      : 'update_equipmentType',
      user      : req.user._id,
      model     : document
    });

    res.status(200).send({error: false, data: document});
  };

  mongoEquipmentType.findOneAndUpdate(query, {$set: setValues}, option, onUpdateDocument);
};

/* ########################################################################## */
/* DELETE RESOURCES                                                           */
/* ########################################################################## */
