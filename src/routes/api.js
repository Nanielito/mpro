var Express = require('express');
var Sanitizer = require('sanitizer');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');

var SessionHandle = require('../libs/sessionHandle');

var Account = require('./entityResources/account');
var Entity = require('./entityResources/entity');
var EquipmentType = require('./entityResources/equipmentType');
var Equipment = require('./entityResources/equipment');
var MaintenanceActivity = require('./entityResources/maintenanceActivity');
var MaintenanceActivityAttention = require('./entityResources/maintenanceActivityAttention');
var Notifications = require('./entityResources/notification');


var router = Express.Router();
var csrfProtection = Csrf({cookie: true});

router.use(function (req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  req.body = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.body))));
  req.params = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.params))));
  req.query = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.query))));
  next();
});

/* ########################################################################## */
/* ACCOUNT ROUTES                                                             */
/* ########################################################################## */

router.post(
  '/accounts',
  SessionHandle.isLogged,
  Account.createAccount);

router.get(
  '/accounts/:page-:quantity/:search',
  SessionHandle.isLogged,
  Account.getAccounts);

router.get(
  '/accounts/:account',
  SessionHandle.isLogged,
  Account.getAccount);

router.get(
  '/accounts/technicians/company/:company', 
  SessionHandle.isLogged,
  Account.getTechniciansByCompany);

router.get(
  '/accounts/technicians/branchCompany/:branchCompany',
  SessionHandle.isLogged,
  Account.getTechniciansByBranchCompany);


router.put(
  '/accounts/:account',
  SessionHandle.isLogged,
  Account.updateAccount);

/* ########################################################################## */
/* ENTITIES ROUTES                                                            */
/* ########################################################################## */

router.post(
  '/entities',
  SessionHandle.isLogged,
  Entity.createEntity);

router.get(
  '/entities/:page/:quantity/:type/:search',  
  Entity.getEntities);

router.get(
  '/entities/:entity',
  SessionHandle.isLogged,
  Entity.getEntity);

router.get(
  '/entities/branchCompanies/company/:company',
  SessionHandle.isLogged,
  Entity.getBranchCompaniesByCompany);

router.put(
  '/entities/:entity',
  SessionHandle.isLogged,
  Entity.updateEntity);


/* ########################################################################## */
/* EQUIPMENT TYPES ROUTES                                                     */
/* ########################################################################## */

router.post(
  '/equipmentTypes',
  SessionHandle.isLogged,
  EquipmentType.createEquipmentType);

router.get(
  '/equipmentTypes/:page/:quantity/:search',
  SessionHandle.isLogged,
  EquipmentType.getEquipmentTypes);

router.get(
  '/equipmentTypes/:equipmentType',
  SessionHandle.isLogged,
  EquipmentType.getEquipmentType);

router.get(
  '/equipmentTypes/company/:company',
  SessionHandle.isLogged,
  EquipmentType.getEquipmentTypesByCompany);

router.put(
  '/equipmentTypes/:equipmentType',
  SessionHandle.isLogged,
  EquipmentType.updateEquipmentType);


/* ########################################################################## */
/* EQUIPMENT ROUTES                                                           */
/* ########################################################################## */

router.post(
  '/equipments',
  SessionHandle.isLogged,
  Equipment.createEquipment);

router.get(
  '/equipments/:page/:quantity/:search',
  SessionHandle.isLogged,
  Equipment.getEquipments);

router.get(
  '/equipments/:equipment',
  SessionHandle.isLogged,
  Equipment.getEquipment);

router.get(
  '/equipments/equipmentType/:equipmentType',
  SessionHandle.isLogged,
  Equipment.getEquipmentsByEquipmentType);

router.put(
  '/equipments/:equipment',
  SessionHandle.isLogged,
  Equipment.updateEquipment);

router.put(
  '/equipments/maintenanceActivityDates/:maintenanceActivityDate',
  SessionHandle.isLogged,
  Equipment.updateMaintenanceActivityDate);


/* ########################################################################## */
/* MAINTENANCE ACTIVITY ROUTES                                                */
/* ########################################################################## */

router.post(
  '/maintenanceActivities',
  SessionHandle.isLogged,
  MaintenanceActivity.createMaintenanceActivities);

router.get(
  '/maintenanceActivities/:maintenanceActivity',
  SessionHandle.isLogged,
  MaintenanceActivity.getMaintenanceActivity);

router.get(
  '/maintenanceActivities/equipmentType/:equipmentType',
  SessionHandle.isLogged,
  MaintenanceActivity.getMaintenanceActivitiesByEquipmentType
  );

router.put(
  '/maintenanceActivities/:maintenanceActivity',
  SessionHandle.isLogged,
  MaintenanceActivity.updateMaintenanceActivity);

  
  router.get(
    '/maintenanceActivities/:page/:quantity/:search',
    MaintenanceActivity.getMaintenanceActivities);


/* ########################################################################## */
/* MAINTENANCE ACTIVITY ATTENTION ROUTES                                      */
/* ########################################################################## */

router.post(
  '/maintenanceActivityAttentions',
  SessionHandle.isLogged,
  MaintenanceActivityAttention.createMaintenanceActivityAttentions);

router.get(
  '/maintenanceActivityAttentions/:equipment/next',
  SessionHandle.isLogged,
  MaintenanceActivityAttention.getNextMaintenanceActivityAttention);

router.get(
  '/maintenanceActivityAttentions/activityDate/:identifier',
  SessionHandle.isLogged,
  MaintenanceActivityAttention.getMaintenanceActivityAttentionByActivityDate);

router.put(
  '/maintenanceActivityAttentions/:maintenanceActivityAttention',
  SessionHandle.isLogged,
  MaintenanceActivityAttention.updateMaintenanceActivityAttention
);

router.get(
  '/maintenanceActivityAttentions/:page/:quantity/:search',
  MaintenanceActivityAttention.getMaintenanceActivityAttention);

/* ########################################################################## */
/* NOTIFICATIONS                                                              */
/* ########################################################################## */

router.get('/notifications', Notifications.sendNotifications);

module.exports = router;
