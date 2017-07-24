var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var branch_company = new Schema({
	name : {
		type: String	
	},
	location : {
		type: String	
	},	
	email :{
		type : String
	},
    phone:{
		type: String	
	},	
    company: {
        type: Schema.Types.ObjectId,
        ref:'company'
    },
    date:{
        type:Date
    }
}, {autoIndex:false});

branch_company.pre('save', function(next){
    var self = this;
    var model = self.model(self.constructor.modelName);    
    console.log(model);
    // enviar el correo antes de que se cree un usuario
    next();
});

module.exports = mongoose.model('branch_company', branch_company);