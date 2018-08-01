var Mongoose = require('mongoose');
var _ = require('underscore');
var Utils = require('../../libs/utils');
var Log = require('../../libs/log');
var EmailService = require('../../libs/emailServices');
var AppMessageProvider = require('../../libs/appMessageProvider');
var mongoEquipment = Mongoose.model('equipment');
var mongoNotification = Mongoose.model('notification');
var mongoAccount = Mongoose.model('account');
var mongoMaintenanceActivityAttention = Mongoose.model('maintenanceActivityAttention');
var DATE_FORMAT = 'DD/MM/YYYY';

exports.sendNotifications = function (req, res, next) {
    
    var findAttentions = new Promise(function (resolve, reject) {
      var today = new Date(), tomorrow = new Date();

      today.setDate(today.getDate()-1)      

      tomorrow.setDate(tomorrow.getDate()+30);
      console.log(today)
      console.log(tomorrow)
      var query = {"date":{"$gte":new Date(today), "$lte":new Date(tomorrow)}, "notificationId":null}, 
          projection={_id:0, "equipment":1, "date":-1, "checked":1, "notificationId":1};
      
      mongoMaintenanceActivityAttention
        .find(query, projection)
        .populate({
          path: 'equipment',
          model:'equipment',     
          populate:{
            path:'branchCompany',
            model:'entity',
            populate:{
              path:'company',
              model:'entity'
            }
        }})
        .populate({
          path:'notificationId',
          model:'notification'
        }).lean().exec()
        .then(function (attentions) {          
          if (!attentions || attentions.length === 0) {            
            resolve([]);
          }
          else {            
            resolve(groupBy(attentions));
          }
        })
        .catch(function(err){
          console.log(err)
          reject(err)
        });
    });

    var sendNotifications = function(attentions){
      return new Promise(function(resolve, reject){
              
        var entities = _.reduce(attentions, function(arrEmpty, arr){
          return arrEmpty.concat([arr.branchCompanyId, arr.companyId]);
        }, [])
        
        entities=[ ...new Set(entities)];
        
        var query = {'company':{$in:entities}, $or:[{'role':'adminCompany'}, {'role':'adminBranchCompany'}]},
          projection={'password':0};

        mongoAccount
          .find(query, projection).lean().exec()
          .then(function(accounts){
            
            var tempAccountsToNotify = _.reduce(attentions, function(arrEmpty, arr){
              arr.userAssigned['equipment']=arr.equipment;
              arr.userAssigned['serviceDate']=arr.date;
              return arrEmpty.concat(arr.userAssigned);  
            }, []);

            tempAccountsToNotify=[ ...new Set(tempAccountsToNotify)];
            
            var arrAccountsToNotify;

            _.each(tempAccountsToNotify, function(val, key){
            
              arrAccountsToNotify = _.reduce(accounts, function(arrEmpty, arr){                
                arr['equipment']=val.equipment;
                arr['serviceDate']=val.serviceDate;
                return arrEmpty.concat(arr);  
              }, tempAccountsToNotify);

            });
              
            arrAccountsToNotify=[ ...new Set(arrAccountsToNotify)];            
            
            _.each(arrAccountsToNotify, function(value, key){        
              notify(value);
            });

            resolve(attentions);

          })
                
      });
    };

    var groupBy = function(list, groupby){
      
      var result = [], obj = {};
      result = _.reduce(list, function(arrEmpty, val){        
        var key = "".concat(val.equipment._id,"-",val.date);

        if(!obj[key]&&val.checked==false){

          obj[key]={ ...{
            equipmentId:val.equipment._id, 
            date:val.date, 
            userAssigned:val.equipment.userAssigned,
            name:val.equipment.userAssigned.name, 
            equipment:val.equipment.name,
            notificationId:val.notification,
            branchCompanyId:val.equipment.branchCompany._id,
            companyId:val.equipment.branchCompany.company._id
          }};

          arrEmpty.push(obj[key]);
        }
        return arrEmpty;
      },[]);
      return result;
    };

    var notify = function(account){
      EmailService.send({
        to: account.email,
        subject: AppMessageProvider.getMessage('NOTIFICATION_SUBJECT'),
        text: AppMessageProvider.getMessage(
          'NOTIFICATION_EMAIL_TEXT',[account.name, Utils.formatDate(account.serviceDate, DATE_FORMAT), account.equipment])
      });

    };

    var markAsNotified = function(notifications){
      return new Promise(function(resolve, reject){
        var result = [];        
        var createNotification = _.reduce(notifications, function (arrEmpty, notification) {           
          arrEmpty.push(saveNotification({
            equipment: notification.equipmentId,
            date:notification.date
          }));
          return arrEmpty;
        }, []);
        
        Promise.all(createNotification)
        .then(alreadyNotified)
        .then(function(data){          
          resolve(data);
        })
      });
    };

    var saveNotification = function (notification){
      var promise = new Promise(function (resolve, reject) {
        var onCreateDocument = function (err, document) {          
          if (err) {
            resolve({error: true, message: err.message});
          };          
          return resolve(document)

        };
        var newNotification = new mongoNotification(notification);
      
        newNotification.save(onCreateDocument);
      });
      return promise;
    };

    var updateAttentions = function(notification){
      var promise = new Promise(function(resolve, reject){
        var query = {"date":notification.date, "equipment":notification.equipment},
            update = {notificationId:notification._id},
            option = {multi : true};

        mongoMaintenanceActivityAttention.update(query, update, option, function(err, document){          
          if(err){
            reject(err)
          }
          resolve(document);
        });
      });
      return promise;
    };

    var alreadyNotified = function(data){
      return new Promise(function(resolve, reject){
        
        var arrAttentionsUpdated = _.reduce(data, function (arrEmpty, notification) {
          arrEmpty.push(updateAttentions(notification));
          return arrEmpty;
        }, []);
        
        Promise.all(arrAttentionsUpdated)
        .then(function(data){          
          resolve(data)
        });        
      });
    };
  
    var onFinish = function (data){
      res.status(200).send(data);
    };
  
    findAttentions
      .then(sendNotifications)
      .then(markAsNotified)
      .then(onFinish)
      .catch(function (err) {
        res.status(500).send(err.message);
      });
  };