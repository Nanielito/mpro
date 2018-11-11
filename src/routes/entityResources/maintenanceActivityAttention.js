var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../libs/utils');
var Log = require('../../libs/log');

var mongoEquipment = Mongoose.model('equipment');
var mongoEquipmentType = Mongoose.model('equipmentType');
var mongoMaintenanceActivity = Mongoose.model('maintenanceActivity');
var mongoMaintenanceActivityAttention = Mongoose.model('maintenanceActivityAttention');

var DATE_FORMAT = 'DD/MM/YYYY';

/* ########################################################################## */
/* CREATE RESOURCES                                                           */
/* ########################################################################## */

exports.createMaintenanceActivityAttentions = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }
  
  var documents = JSON.parse(req.body.documents);
  var maintenanceActivityDates = [];

  var maintenanceActivityAttentions = Functional.reduce(documents, function (accumulator, document, index) {
    var identifier = Utils.createUniqueId(index + 1);
    var maintenanceActivityDate = {date: new Date(document.date), identifier: identifier};
    
    maintenanceActivityDates.push(maintenanceActivityDate);

    accumulator = Functional.reduce(document.maintenanceActivityAttentions, function (accumulator, maintenanceActivityAttention) {
      maintenanceActivityAttention['identifier'] = identifier;
      maintenanceActivityAttention['date'] = new Date(maintenanceActivityAttention.date);
      accumulator.push(maintenanceActivityAttention);
      return accumulator;
    }, accumulator);
    
    return accumulator;
  }, []);
  
  var saveMaintenanceActivityAttentionPromise = function (maintenanceActivityAttention) {
    var promise = new Promise(function (resolve, reject) {
      var onCreateDocument = function (err, document) {        
        if (err) {
          console.log(err)
          Log.error({
            parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_EXCEPTION', err],
            //text      : 'Exception! '.concat(err),
            type      : 'create_maintenanceActivityAttention',
            user      : req.user._id,
            model     : err
          });

          resolve({error: true, code: 500, message: err.message});
        };

        Log.debug({
          parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_CREATE_SUCCESS', req.user.name, document.name],
          //text      : 'Success on create! '.concat('User ', req.user.name, ' creates maintenance activity attention', document.name),
          type      : 'create_maintenanceActivityAttention',
          user      : req.user._id,
          model     : document
        });
  
        resolve({error: false, data: document});
      };
  
      var newMaintenanceActivityAttention = new mongoMaintenanceActivityAttention(maintenanceActivityAttention);
    
      newMaintenanceActivityAttention.save(onCreateDocument);
    });

    return promise;
  };

  var rollBackPromise = function (maintenanceActivityAttention) {
    var promise = new Promise(function (resolve, reject) {
      var onRemoveDocument = function (err, document) {
        if (err) {
          Log.error({
            parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_EXCEPTION', err],
            //text      : 'Exception! '.concat(err),
            type      : 'rollback_maintenanceActivityAttention',
            user      : req.user._id,
            model     : err
          });

          reject({error: true, code: 500, message: err.message});
        };

        Log.debug({
          parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_ROLLBACK_SUCCESS', req.user.name, document.name],
          //text      : 'Success on rollback! '.concat('System deletes maintenance activity attention', document.name, ' which was previously saved'),
          type      : 'rollback_maintenanceActivityAttention',
          user      : req.user._id,
          model     : document
        });
  
        resolve({error: false, data: document});
      };
      
      mongoMaintenanceActivityAttention.findByIdAndRemove(maintenanceActivityAttention._id, onRemoveDocument);
    });

    return promise;
  };
  
  var createDocumentPromises = Functional.reduce(maintenanceActivityAttentions, function (accumulator, maintenanceActivityAttention) {
    var promise = saveMaintenanceActivityAttentionPromise(maintenanceActivityAttention);
    accumulator.push(promise);
    return accumulator;
  }, []);

  var onCreateDocuments = function (results) {
    var promise = new Promise(function (resolve, reject) {
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
  
        reject({error: true, code: 412, message: errors, results: bulkTrace});
      }
      else {
        var documents = Functional.reduce(results, function (accumulator, result) {
          accumulator.push(result.data);
          return accumulator;
        }, []);

        resolve([documents, maintenanceActivityDates]);
      }
    });

    return promise;   
  }

  var onUpdateEquipment = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var query = {_id: req.body.equipment};
      var options = {new: true, upsert: true};
      var maintenanceActivityAttentions = data[0];
      var maintenanceActivityDates = data[1];
    
      var onUpdateDocument = function (err, document) {
        if (err || !document) {
          var rollBackPromises = Functional.reduce(maintenanceActivityAttentions, function (accumulator, maintenanceActivityAttention) {
            var promise = rollBackPromise(maintenanceActivityAttention);
            accumulator.push(promise);

            return accumulator;
          }, []);

          Promise.all(rollBackPromises)
          .then(function (data) {
            // console.log('ROLLBACK: ', data);
          });

          if (err) {
            Log.error({
              parameters: ['EQUIPMENT_EXCEPTION', err],
              //text      : 'Exception! '.concat(err),
              type      : 'update_equipment',
              user      : req.user._id,
              model     : err
            });

            reject({error: true, code: 500, message: 'Unexpected error was occurred'});
          }

          if (!document) {
            reject({error: true, code: 404, message: 'Equipment document does not exist'});
          }
        }
        else {
          resolve({error: false, data: maintenanceActivityAttentions});
        }
      };
    
      mongoEquipment.findOneAndUpdate(query, {$push: {maintenanceActivityDates: {$each: maintenanceActivityDates}}}, options, onUpdateDocument);
    });

    return promise;
  };

  var onFinish = function (data) {
    res.status(200).send(data);
  };

  Promise.all(createDocumentPromises)
  .then(onCreateDocuments)
  .then(onUpdateEquipment)
  .then(onFinish)
  .catch(function (err) {
    res.status(err.code).send(err.message);
  });
};

/* ########################################################################## */
/* READ RESOURCES                                                             */
/* ########################################################################## */

exports.getNextMaintenanceActivityAttention = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var maintenanceActivityDatesPromise = new Promise(function (resolve, reject) {
    var query = {_id: req.params.equipment};
    var projection = {_id: 0, maintenanceActivityDates: 1};
    
    mongoEquipment.findOne(query).select(projection).exec()
    .then(function (data) {
      resolve(data.maintenanceActivityDates);
    })
    .catch(function (err) {
      reject({error: true, code: 500, message: err.message});
    });
  });

  var getNextMaintenanceActivityDate = function (maintenanceActivityDates) {
    var currentDate = Date.now();
    
    maintenanceActivityDates = maintenanceActivityDates.sort(function (a, b) {
      return (new Date(b.date)).getTime() < (new Date(a.date)).getTime();
    });

    var maintenanceActivityDate = Functional.find(maintenanceActivityDates, function (maintenanceActivityDate) {
      var date = Utils.getEndDate(maintenanceActivityDate.date);
      
      return currentDate <= date.getTime(); 
    });

    return maintenanceActivityDate;
  };

  var getMaintenanceAttention = function (maintenanceActivityDate) {
    var enableStart = function (maintenanceActivityDate) {
      var enable = false;
      var currentDate = Date.now();
      var rangeDates = Utils.getLimitDates(maintenanceActivityDate.date);

      if (maintenanceActivityDate.started === false && 
        rangeDates.min.getTime() <= currentDate && 
        currentDate <= rangeDates.max.getTime()) {
        enable = true;
      }

      return enable;
    };

    var enableFinish = function (maintenanceActivityDate) {
      var enable = false;

      if (maintenanceActivityDate.started === true &&
        typeof maintenanceActivityDate.finishedDate === 'undefined') {
        enable = true;
      }

      return enable;
    };

    var promise = new Promise(function (resolve, reject) {
      if (typeof maintenanceActivityDate !== 'undefined') {
        var query = {identifier: maintenanceActivityDate.identifier};
  
        mongoMaintenanceActivityAttention
        .find(query)
        .populate({path: 'maintenanceActivity', select: {_id: 0, name: 1}})
        .exec()
        .then(function (maintenanceActivityAttentions) {
          var result = {};

          if (enableStart(maintenanceActivityDate) === true) {
            result['enableStart'] = true;
            result['enableFinish'] = false;
          }
          else if (enableFinish(maintenanceActivityDate) === true) {
            result['enableStart'] = false;
            result['enableFinish'] = true;
          }
          else {
            result['enableStart'] = false;
            result['enableFinish'] = false;
          }

          result['started'] = maintenanceActivityDate.started,
          result['finished'] = maintenanceActivityDate.finished;
          result['maintenanceActivityDate'] = maintenanceActivityDate._id;
          result['comment'] = maintenanceActivityDate.comment;
          result['date'] = Utils.formatDate(maintenanceActivityDate.date, DATE_FORMAT);
          result['maintenanceActivityAttentions'] = maintenanceActivityAttentions;
          
          resolve({error: false, data: result});
        })
        .catch(function (err) {
          reject({error: true, code: 500, message: err.message});
        });
      }
      else {
        reject({error: true, code: 404, message: 'No document found'});
      }
    });
  
    return promise;
  };

  var onFinish = function (data) {
    res.status(200).send(data);
  };  

  maintenanceActivityDatesPromise
  .then(getNextMaintenanceActivityDate)
  .then(getMaintenanceAttention)
  .then(onFinish)
  .catch(function (err) {
    res.status(err.code).send(err.message);
  });
};

exports.getMaintenanceActivityAttentionByActivityDate = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var maintenanceActivityDatePromise = new Promise(function (resolve, reject) {
    var query = {'maintenanceActivityDates.identifier': req.params.identifier};
    var projection = {_id: 0, 'maintenanceActivityDates.$': 1};

    mongoEquipment.findOne(query).select(projection).exec()
    .then(function (data) {
      resolve(data.maintenanceActivityDates[0]);
    })
    .catch(function (err) {
      reject({error: true, code: 500, message: err.message});
    })
  });

  var getMaintenanceAttention = function (maintenanceActivityDate) {
    var promise = new Promise(function (resolve, reject) {
      if (typeof maintenanceActivityDate !== 'undefined') {
        var query = {identifier: maintenanceActivityDate.identifier};
  
        mongoMaintenanceActivityAttention
        .find(query)
        .populate({path: 'maintenanceActivity', select: {_id: 0, name: 1}})
        .exec()
        .then(function (maintenanceActivityAttentions) {
          var result = {};

          result['started'] = maintenanceActivityDate.started,
          result['finished'] = maintenanceActivityDate.finished;
          result['maintenanceActivityDate'] = maintenanceActivityDate._id;
          result['date'] = Utils.formatDate(maintenanceActivityDate.date, DATE_FORMAT);
          result['maintenanceActivityAttentions'] = maintenanceActivityAttentions;
          
          resolve({error: false, data: result});
        })
        .catch(function (err) {
          reject({error: true, code: 500, message: err.message});
        });
      }
      else {
        reject({error: true, code: 404, message: 'No document found'});
      }
    });
  
    return promise;
  };

  var onFinish = function (data) {
    res.status(200).send(data);
  };  

  maintenanceActivityDatePromise
  .then(getMaintenanceAttention)
  .then(onFinish)
  .catch(function (err) {
    res.status(err.code).send(err.message);
  });
};

exports.getMaintenanceActivityAttention = function (req, res, next) {
  
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
      if(data[0].role=='admin')
        query={};
      else
        query = {company: data[0].company.company != undefined ? data[0].company.company._id : data[0].company._id};
      if (typeof req.params.search !== 'undefined' && req.params.search != 'all') {
        var searchPattern = req.params.search;
      }
      
      mongoMaintenanceActivity.find(query).populate('equipmentType').exec()
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

  var onFetchMaintenanceActivityAttentions = function (data) {
    var maintenanceActivityIds = Functional.reduce(data[2], function (accumulator, maintenanceActivity) {
      accumulator.push(maintenanceActivity._id);
      return accumulator;
    }, []);

    var promise = new Promise(function (resolve, reject) {
      var query = {maintenanceActivity: {$in: maintenanceActivityIds}};

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
  };

  onFetchEquipmentTypes(req.user)
  .then(onFetchMaintenanceActivities)
  .then(onFetchMaintenanceActivityAttentions)
  .then(function(data){ 
    res.render('partials/maintenance-table-body', {
      error:false,
      maintenanceActivityAttentions: data[3]
    }); 
  });

};

/* ########################################################################## */
/* UPDATE RESOURCES                                                           */
/* ########################################################################## */

exports.updateMaintenanceActivityAttention = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {_id: req.params.maintenanceActivityAttention}
  var option = {new: true};
  var setValues = {};

  if (typeof req.body.checked !== 'undefined') {
    setValues['checked'] = req.body.checked;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      Log.error({
        parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_EXCEPTION', err],
        //text      : 'Exception! '.concat(err),
        type      : 'update_maintenanceActivityAttention',
        user      : req.user._id,
        model     : err
      });

      res.status(500).send({error: true, message: 'Unexpected error was occurred', document: req.params.maintenanceActivityAttention});
    }

    if (!document) {
      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    Log.debug({
      parameters: ['MAINTENANCE_ACTIVITY_ATTENTION_UPDATE_SUCCESS', req.user.name, document.name],
      //text      : 'Success on update! '.concat('User ', req.user.name, ' updates maintenance activity attention ', document.name),
      type      : 'update_maintenanceActivityAttention',
      user      : req.user._id,
      model     : document
    });

    res.status(200).send({error: false, data: document});
  };

  mongoMaintenanceActivityAttention.findOneAndUpdate(query, {$set: setValues}, option, onUpdateDocument);
};

/* ########################################################################## */
/* DELETE RESOURCES                                                           */
/* ########################################################################## */
