var Mongoose = require('mongoose');
var Moment = require('moment');
var _ = require('underscore');
var ObjectId = Mongoose.Schema.Types.ObjectId;
var LogMessageProvider = require('./logMessageProvider');
var Utils = require('./utils');
var logModel = Mongoose.model('log');
var accountModel = Mongoose.model('account');
var entityModel = Mongoose.model('entity');
var DATE_FORMAT = 'DD/MM/YYYY';
var log = {};

log.debug = function (obj) {
  return createLog('debug', obj);
};

log.info = function (obj) {
  return createLog('info', obj);
};

log.error = function (obj) {
  return createLog('error', obj);
};

var createLog = function (type, obj) {
  return new Promise(function (resolve, reject) {
    obj.level = type;

    if (typeof obj.text === 'undefined') {
      obj.text = LogMessageProvider.applyMessageLog(obj.parameters);
    }
    
    onCreateLog(obj).then(resolve).catch(reject);
  });
};

log.getLogs = function (total, skip) {
  var accountByCompanyPromise = function(user) {
    return new Promise(function(resolve, reject) {
      var query = {company:user.company._id};
                          
      accountModel
      .find(query)
      .then(function (data) {        
        resolve(data)
      })
      .catch(reject);
    });
  };

  var branchEntityByEntity = function (user) {
    return new Promise(function (resolve, reject) {
      var query = {company:user.company._id};            
      entityModel
      .find(query)
      .then(function (data) {
        var arr = [];
    
        data.forEach(function (v, k) {
          arr.push(v._id);
        });
        
        resolve([arr, user]);
      })
      .catch(reject);
    });
  };

  var accountsByBranchCompany = function (obj) {
    return new Promise(function (resolve, reject) {
      var query = { 'company': { $in: obj[0] }};
      
      accountModel
      .find(query)
      .then(function (data) {
        resolve([data, obj[1]])
      })
      .catch(reject);
      

    });
  };

  var getLogsByUsersId = function (ids) {
    return new Promise(function (resolve, reject) {
      var usersList = ids.map(function (o) {
        return Mongoose.Types.ObjectId(o._id);
      });            
      
      var query = {user: {$in: usersList}};

      logModel.find(query).exec()
      .then(function (data) {
        resolve(data);
      })
      .catch(function (err) {
        reject(data);
      });
    });
  };

  var accountsByCompany = function (data) {
    return new Promise(function (resolve, reject) {
      accountByCompanyPromise(data[1])
      .then(getArrQuery)
      .then(getLogsByUsersId)
      .then(function (data) {
          return resolve(data);
      })
      .catch(reject);
    });

    var getArrQuery = function (data) {
      return new Promise(function (resolve, reject) {
        var arr = [], aux = [];
                
        if (accounts.length > 0) {
          aux = accounts.concat(data[0]);
          
          aux.forEach(function (account) {
            if (account) {
              arr.push(account._id);
            }
          }, this);
          return resolve(arr);
        }

        return reject([]);
      });
    }
  };

  var onFetchLogBySingleUser = function (user) {
    return new Promise(function (resolve, reject) {
      var query = {user:user._id};
      
      logModel.find(query).sort({date: -1 }).exec()
        .then(function(data){
          var result=[];
          _.each(data, function(value, key){            
            result.push({
              type:value.type,
              level:value.level,
              date:Utils.formatDate(value.date, DATE_FORMAT),
              parameters:value.parameters,
              text:value.text
            });
          });
          resolve(result);
        })
        .catch(reject);
    });
  };

  var onFilterLogsByBranchCompany = function (user) {
    return new Promise(function (resolve, reject) {
      accountByCompanyPromise(user)
      .then(function (accounts) {        
        getLogsByUsersId(accounts)
        .then(function (data) {
          var result=[];
          _.each(data, function(value, key){            
            result.push({
              type:value.type,
              level:value.level,
              date:Utils.formatDate(value.date, DATE_FORMAT),
              parameters:value.parameters,
              text:value.text
            });
          });
          resolve(result);
        });
      })
      .catch(function (err) {
        reject(err);
      });
    });
  };

  var onFilterLogsByCompany = function (user) {
    return new Promise(function (resolve, reject) {      
      branchEntityByEntity(user)
        .then(accountsByBranchCompany)
        .then(accountsByCompany)
        .then(function (data) {
          var result=[];
          _.each(data, function(value, key){            
            result.push({
              type:value.type,
              level:value.level,
              date:Utils.formatDate(value.date, DATE_FORMAT),
              parameters:value.parameters,
              text:value.text
            });
          });
          return resolve(result);
        })
        .catch(function (data) {
          return reject(data);
        });
    });
  };

  var onFetchAllLogs = function () {
    return new Promise(function (resolve, reject) {

      var query = [
        {$match:{}},
        {$facet:{
          edges:[
            {$skip:skip},
            {$limit:total}
          ],
          pageInfo:[
            {$group:{_id:null, count:{$sum:1}}}
          ]
        }}
      ];

      /*logModel.aggregate(query)
      .exec()
      .then(resolve)
      .catch(reject);
      */
      logModel
        .find({})
        .sort({date: -1})
        .exec()
        .then(function (data) {
          var result=[];
          _.each(data, function(value, key){            
            result.push({
              type:value.type,
              level:value.level,
              date:Utils.formatDate(value.date, DATE_FORMAT),
              parameters:value.parameters,
              text:value.text
            });
          });
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  };

  var onFetchByRole = function (user) {
    return new Promise(function (resolve, reject) {
      switch (user.role) {
        case 'admin':
          onFetchAllLogs().then(resolve).catch(reject);
          break;
        case 'adminCompany':
          onFilterLogsByCompany(user).then(resolve).catch(reject);
          break;
        case 'adminBranchCompany':
          onFilterLogsByBranchCompany(user).then(resolve).catch(reject);
          break;
        case 'technician':
          onFetchLogBySingleUser(user).then(resolve).catch(reject);
          break;
      };
    });
  };

  return {
    onFetchByRole: onFetchByRole
  }
};

function onCreateLog (obj) {
  return new Promise(function (resolve, reject) {    
    var log = new logModel(obj);
    
    log.save(function (err, document) {
      if (err) {
        return reject(err);
      }
      
      return resolve(document);
    });
  });
};

module.exports = log;