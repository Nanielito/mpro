var Mongoose = require('mongoose');
var Functional = require('underscore');

var Utils = require('../../libs/utils');

var mongoEquipment = Mongoose.model('equipment');
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
          console.log('ERROR on Create:', err.message);
          resolve({error: true, code: 500, message: err.message});
        };
  
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
          console.log('ERROR on RollBack:', err.message);
          reject({error: true, code: 500, message: err.message});
        };
  
        resolve({error: false, data: document});
      };
      
      // console.log("ROLLBACK Document ID: ", maintenanceActivityAttention._id);
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
            // console.log('DOCUMENT CREATED: ', result.data);
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
      var query = {'_id': req.body.equipment};
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
    console.log('ERROR:', err.message);
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
    var query = {'_id': req.params.equipment};
    var projection = {'_id': 0, maintenanceActivityDates: 1};
    
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

  maintenanceActivityDatesPromise
  .then(getNextMaintenanceActivityDate)
  .then(getMaintenanceAttention)
  .then(onFinish)
  .catch(function (err) {
    console.log('ERROR:', err.message);
    res.status(err.code).send(err.message);
  });
};

/* ########################################################################## */
/* UPDATE RESOURCES                                                           */
/* ########################################################################## */

exports.updateMaintenanceActivityAttention = function (req, res, next) {
  if (!req.user || !req.user.username) {
    res.status(401).send({error: true, message: 'No user found'});
  }

  var query = {'_id': req.params.maintenanceActivityAttention}
  var option = {new: true};
  var setValues = {};

  if (typeof req.body.checked !== 'undefined') {
    setValues['checked'] = req.body.checked;
  }

  var onUpdateDocument = function (err, document) {
    if (err) {
      res.status(500).send({error: true, message: 'Unexpected error was occurred', document: req.params.maintenanceActivityAttention});
    }

    if (!document) {
      res.status(404).send({error: true, message: 'Document does not exist'});
    }

    res.status(200).send({error: false, data: document});
  };

  mongoMaintenanceActivityAttention.findOneAndUpdate(query, {$set: setValues}, option, onUpdateDocument);
};

/* ########################################################################## */
/* DELETE RESOURCES                                                           */
/* ########################################################################## */
