var Moment = require('moment');
var bCrypt = require('bcrypt-nodejs');

var Utils = {
	getDbConnection: function (handler, config) {
    return handler.connect(['mongodb://',config.user||'',config.db.host,':',config.db.port,'/',config.db.name].join(''));
  },

	createHash: function (password) {
		return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
  },
  
  createUniqueId: function (prefix) {
    var pid = (process !== undefined && process.id !== undefined ? process.id.toString(36) : '');
    var now = function () {
      var time = Date.now();
      var last = now.last || time;
      return now.last = time > last ? time : last + 1;
    };
    var chr4 = function () {
      return Math.random().toString(16).slice(-4);
    };
    
    return (prefix || '') + pid + now().toString(36) + chr4();
  },

  formatDate: function (date, format) {
    return Moment(date.toString()).format(format);
  },

  getStartDate: function (date) {
    var newDate = new Date(date);
    
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    return newDate;
  },

  getEndDate: function (date) {
    var newDate = new Date(date);
    
    newDate.setHours(23);
    newDate.setMinutes(59);
    newDate.setSeconds(59);
    newDate.setMilliseconds(999);

    return newDate;
  },

  getLimitDates: function (date) {
    var limitDates = {
      min: Utils.getStartDate(date),
      max: Utils.getEndDate(date)
    };
    
    return limitDates;
  }
};

module.exports = Utils;