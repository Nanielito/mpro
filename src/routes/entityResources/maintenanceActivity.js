var Mongoose = require('mongoose');
var Functional = require('underscore');

var Log = require('../../libs/log');
var mongoEquipmentType = Mongoose.model('equipmentType');
var mongoMaintenanceActivity = Mongoose.model('maintenanceActivity');

/* ########################################################################## */
/* CREATE RESOURCES                                                           */
/* ########################################################################## */

exports.createMaintenanceActivities = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var maintenanceActivities = JSON.parse(req.body.documents);

  var saveMaintenanceActivityPromise = function (maintenanceActivity) {
    var promise = new Promise(function (resolve, reject) {
      var onCreateDocument = function (err, document) {        
        if (err) {
          Log.error({
            parameters: ['MAINTENANCE_ACTIVITY_EXCEPTION', err],
            //text      : 'Exception! '.concat(err),
            type      : 'create_maintenanceActivity',
            user      : req.user._id,
            model     : err
          });

          resolve({error: true, message: err.message});
        };

        Log.debug({
          parameters: ['MAINTENANCE_ACTIVITY_CREATE_SUCCESS', req.user.name, document.name],
          //text      : 'Success on create! '.concat('User ', req.user.name, ' creates maintenance activity ', document.name),
          type      : 'create_maintenanceActivity',
          user      : req.user._id,
          model     : document
        });

        resolve({error: false, data: document});
      };
  
      var newMaintenanceActivity = new mongoMaintenanceActivity(maintenanceActivity);
    
      newMaintenanceActivity.save(onCreateDocument);
    });

    return promise;
  };

  var rollBackPromise = function (maintenanceActivity) {
    var promise = new Promise(function (resolve, reject) {
      var onRemoveDocument = function (err, document) {
        if (err) {
          Log.error({
            parameters: ['MAINTENANCE_ACTIVITY_EXCEPTION', err],
            //text      : 'Exception! '.concat(err),
            type      : 'rollback_maintenanceActivity',
            user      : req.user._id,
            model     : err
          });

          reject({error: true, message: err.message});
        };

        Log.debug({
          parameters: ['MAINTENANCE_ACTIVITY_ROLLBACK_SUCCESS', req.user.name, document.name],
          //text      : 'Success on rollback! '.concat('System deletes maintenance activity ', document.name, ' which was previously saved'),
          type      : 'rollback_maintenanceActivity',
          user      : req.user._id,
          model     : document
        });
  
        resolve({error: false, data: document});
      };
      
      mongoMaintenanceActivity.findByIdAndRemove(maintenanceActivity._id, onRemoveDocument);
    });

    return promise;
  };

  var createDocumentPromises = Functional.reduce(maintenanceActivities, function (accumulator, maintenanceActivity) {
    var promise = saveMaintenanceActivityPromise(maintenanceActivity);
    accumulator.push(promise);
    return accumulator;
  }, []);

  var onCreateDocuments = function (results) {
    var errors = Functional.filter(results, function (result) {
      return result.error === true;
    });

    if (errors.length > 0) {
      var bulkTrace = Functional.reduce(results, function (accumulator, result) {
        accumulator.push(result.error);
        return accumulator;
      }, []);

      var rollBackPromises = Functional.reduce(results, function (accumulator, result) {
        if (result.error === false) {
          var promise = rollBackPromise(result.data);
          accumulator.push(promise);    
        }

        return accumulator;
      }, []);

      Promise.all(rollBackPromises)
      .then(function (data) {
        // console.log('ROLLBACK: ', data);
      });

      res.status(412).send({error: true, message: errors, results: bulkTrace});
    }
    else {
      var documents = Functional.reduce(results, function (accumulator, result) {
        accumulator.push(result.data);
        return accumulator;
      }, []);

      res.status(200).send(documents);
    }
  }

  Promise.all(createDocumentPromises)
  .then(onCreateDocuments)
  .catch(function (err) {
    res.status(500).send(err.message);
  });
};

/* ########################################################################## */
/* READ RESOURCES                                                             */
/* ########################################################################## */

exports.getMaintenanceActivity = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.maintenanceActivity};

  mongoMaintenanceActivity.findOne(query).populate('company').populate('equipmentType').exec()
  .then(function (document) {
    res.status(200).send({error: false, data: document});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: 'Unexpected error was occurred'});
  });
};

exports.getMaintenanceActivitiesByEquipmentType = function (req, res, next) {
  var maintenanceActivitiesPromise = new Promise(function (resolve, reject) {
    var query = {equipmentType: req.params.equipmentType};
    var projection = {_id: 1, name: 1};

    mongoMaintenanceActivity.find(query, projection).exec()
    .then(function (maintenanceActivities) {
      resolve(maintenanceActivities);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  maintenanceActivitiesPromise
  .then(function (maintenanceActivities) {
    res.status(200).send({error: false, data: maintenanceActivities});
  })
  .catch(function (err) {
    res.status(500).send({error: true, message: err.message});
  });
};

exports.getMaintenanceActivities = function (req, res, next){

  var onFetchEquipmentTypes = function (user) {
    var promise = new Promise(function (resolve, reject) {
      var query;
      if(user.company==undefined)
        query = {}
      else
        query = {company: user.company._id };

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
      var query, expression;
      if(data[0].role=='admin'){
        query={};
      }
      else{
        query = {company: data[0].company.company != undefined ? data[0].company.company._id : data[0].company._id};
      }
      if (typeof req.params.search !== 'undefined' && req.params.search != 'all') {
        var searchPattern = req.params.search;
      }
      
      mongoMaintenanceActivity.find(query)
      .populate('company')
      .populate('equipmentType').exec()
      .then(function (maintenanceActivitiesResult) {
        var maintenanceActivities=[];
        Functional.each(maintenanceActivitiesResult, function(currentvalue){          
          expression=new RegExp(searchPattern, 'i');
          if(expression.exec(currentvalue.name)!=null){            
            maintenanceActivities.push(currentvalue);
          }
        });
        
        data.push(maintenanceActivities);
        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  onFetchEquipmentTypes(req.user)
  .then(onFetchMaintenanceActivities)
  .then(function(data){ 
    res.render('partials/activity-table-body', {
      error:false,
      user:req.user,
      maintenanceActivities: data[2]
    }); 
  });
};


/* ########################################################################## */
/* UPDATE RESOURCES                                                           */
/* ########################################################################## */

exports.updateMaintenanceActivity = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.maintenanceActivity};			
  var option = {new: true};
  var setValues = {};

  if (typeof req.body.name !== 'undefined') {
    setValues['name'] = req.body.name;
  }

  if (typeof req.body.description !== 'undefined') {
    setValues['description'] = req.body.description;
  }

  if (typeof req.body.status !== 'undefined') {
    setValues['status'] = req.body.status;
  }

  if (typeof req.body.deleted !== 'undefined') {
    setValues['deleted'] = req.body.deleted;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      res.status(500).send({error: true, message: 'Unexpected error was occurred'});
    }
    
    if (!document) {
      Log.error({
        parameters: ['MAINTENANCE_ACTIVITY_EXCEPTION', err],
        //text      : 'Exception! '.concat(err),
        type      : 'update_maintenanceActivity',
        user      : req.user._id,
        model     : err
      });

      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    Log.debug({
      parameters: ['MAINTENANCE_ACTIVITY_UPDATE_SUCCESS', req.user.name, document.name],
      //text      : 'Success on update! '.concat('User ', req.user.name, ' updates maintenance activity ', document.name),
      type      : 'update_maintenanceActivity',
      user      : req.user._id,
      model     : document
    });


    res.status(200).send({error: false, data: document});
  };

  mongoMaintenanceActivity.findOneAndUpdate(query, {$set: setValues}, option, onUpdateDocument);
};

/* ########################################################################## */
/* DELETE RESOURCES                                                           */
/* ########################################################################## */
