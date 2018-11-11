var Mongoose = require('mongoose');
var Schema = Mongoose.Schema;
var ObjectId = Mongoose.Schema.Types.ObjectId;

var equipment = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    location: {
      type: String
    },
    equipmentType: {
      type: Schema.Types.ObjectId,
      ref: 'equipmentType',
      required: true
    },
    branchCompany: {
      type: Schema.Types.ObjectId,
      ref: 'entity',
      required: true
    },
    image: [
      {
        filename: String,
        imageUrl: String
      }
    ],
    maintenanceActivityDates: [
      {
        date: Date,
        identifier: String,
        started: {
          type: Boolean,
          default: false
        },
        finished: {
          type: Boolean,
          default: false
        },
        finishedDate: Date,
        comment: String
      }
    ],
    status: {
      type: Boolean,
      default: true
    },
    deleted: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: Date.now
    },
    userAssigned: {
      type: Schema.Types.ObjectId,
      ref: 'account',
      required: true
    }
  },
  {
    autoIndex: false
  }
);

equipment.pre('save', function (next) {
  var self = this;
  var model = self.model(self.constructor.modelName);
  var query = {name: self.name, code: self.code, equipmentType: self.equipmentType, branchCompany: self.branchCompany};

  model.find(query, function (err, documents) {
    if (documents.length === 0) {
      next();
    }
    else {
      next(new Error(
        'Equipment exists - Name: '.concat(
          self.name, ' Code: ', self.code, ' Equipment Type: ', self.equipmentType, ' Branch Company: ', self.branchCompany)
      ));
    }
  });
});

equipment.pre('find', function(next){
  this.populate('userAssigned');
  next();
});

module.exports = Mongoose.model('equipment', equipment);