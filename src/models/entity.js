var Mongoose = require('mongoose');
var Schema = Mongoose.Schema;
var ObjectId = Mongoose.Schema.Types.ObjectId;

var entity = new Schema(
  {
    name: {
      type: String
    },
    location: {
      type: String
    },	
    email: {
      type: String
    },
    phone: {
      type: String
    },
    type: {
      type: String,
      enum: ['company', 'branchCompany']
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'entity'
    },
    date: {
      type: Date
    },
    status:{
      type:Boolean,
      default:true
    }
  },
  {
    autoIndex: false
  }
);

entity.pre('save', function (next) {
  var self = this;
  var model = self.model(self.constructor.modelName);    
  var query = {name: self.name, type: self.type, email: self.email};

  model.find(query, function (err, documents) {
    if (documents.length === 0) {
      next();
    }
    else {
      next(new Error(
        'Entity already exists - Name: '.concat(
          self.name, 'Type: ', self.type, ' Email: ', self.email)));
    }
  });
});

entity.pre('find', function(next){
  //this.populate('company');
  next();
});

module.exports = Mongoose.model('entity', entity);