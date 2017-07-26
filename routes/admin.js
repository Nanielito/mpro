var express = require('express');
var router = express.Router();
var sanitizer = require('sanitizer');
var mongoSanitize = require('mongo-sanitize');
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });
var mongoose = require('mongoose');
var account = mongoose.model('account');
var company = mongoose.model('company');
var branch_company = mongoose.model('branch_company')
var utils = require('../libs/utils');

router.use(function (req, res, next) {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  req.body = JSON.parse(sanitizer.sanitize(JSON.stringify(mongoSanitize(req.body))));
  req.params = JSON.parse(sanitizer.sanitize(JSON.stringify(mongoSanitize(req.params))));
  req.query = JSON.parse(sanitizer.sanitize(JSON.stringify(mongoSanitize(req.query))));
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {

  if(req.user){

    if(req.session.loginPath){
      res.redirect(req.session.loginPath);
    } else {
      
      if(res.user.role.role=='admin'){
        res.redirect('/admin/' + req.user.nickname);
      }
      
    }

  } else {
    res.render('index', { //csrfToken: req.csrfToken(),
      user : {}
    });

  }

});

router.get('/admin/:identifier', function(req, res, next){
  if(!req.user){
    req.session.loginPath=null;
    console.log('no identifier');
    res.redirect('/login');
  }
  var identifier = req.params.identifier||req.user.identifier;
  var query = {'identifier':identifier}, currentAccount={};
  
  account.findOne(query).exec()
  .then(function(user){    
    if(!user||user.length==0){
      throw new Error('wtf!!');
      return;
    }
    else{      
      currentAccount=user;
    }

    return res.render('pages/dashboard', {
      user : req.user || {},
      //csrfToken: req.csrfToken()
      currentAccount:currentAccount,      
    });

  })
  .catch(function(err){
    console.log('error:', err);
    res.redirect('/');
    return;
  });

});

router.get('/admin/:identifier/admin-activity-block', function(req, res, next){

});

router.get('/admin/:identifier/company', function(req, res, next){
    if(!req.user){
        req.session.loginPath=null;
        console.log('no identifier');
        res.redirect('/login');
    }
    var identifier = req.params.identifier||req.user.identifier;
    var query = {'identifier':identifier}, currentAccount={}, companies=[];
    
    account.findOne(query).exec()
    .then(function(user){
        if(!user||user.length==0){
            throw new Error('wfT!!');
            return;
        }
        else{      
            currentAccount=user;
        }

        if(user.role!='admin'){
            throw new Error('Solo paa administradores generales');
            return;
        }
        return company.find({}).exec()
    })
    .then(function(data){        
        companies=data.slice();        
        return branch_company.find({}).populate('company').exec();
    })
    .then(function(data){        
        var bc = data.splice();
        return res.render('pages/company', {
            user : req.user || {},
            //csrfToken: req.csrfToken()
            currentAccount:currentAccount,
            companies:companies,
            branch_companies:bc,
            roles:account.schema.path('role').enumValues
        });
    })
    .catch(function(err){
        console.log('error:', err);
        res.redirect('/');
        return;
    });
});

router.post('/company', function(req, res, next){
  if(!req.user||!req.user.username){
    return res.json({error:true, message:'Usuario no encontrado'});
  }

  var query = {name:req.body.name, email:req.body.email};
    
    company.find(query).exec()
    .then(function(companyResult){
      if(companyResult.length>0){
        return res.json({error:true,message:'Ya existe la empresa'});        
      }
      var newCompany = new company({
        name : req.body.name,
        email : req.body.email,
        phone : req.body.phone,
        location : req.body.location
      });
      
      newCompany.save(callback);

      function callback(err, doc){
        if(err)
          return res.json({error:true,message:err});
        return res.json({error:false, data:doc});
      };
    });		
});

router.put('/company', function(req, res, next){
    if(!req.user||!req.user.username){
      return res.json({error:true, message:'Usuario no encontrado'});
    }  
    var ObjectId = mongoose.Schema.Types.ObjectId;
		
		var query = { "_id" : new ObjectId(req.body._id) },			
			option = { upsert:true };
		
		company.findOne(query, callback);

		function callback(err, doc){
			
			if(err || !doc){
				return res.json({ error:true, message:'No exite el documento' });
			}
			
			if(typeof req.body.name !== 'undefined')
				doc.reAssigned = req.body.name

			if(typeof req.body.email !== 'undefined')
				doc.email = req.body.email

			if(typeof req.body.phone !== 'undefined')
				doc.phone = req.body.phone

			if(typeof req.body.location !== 'undefined')
				doc.location = req.body.location

			doc.save();

			return res.json({ error:false, data:doc });
		};
});

router.post('/brach-company', function(req, res, next){
  if(!req.user||!req.user.username){
    return res.json({error:true, message:'Usuario no encontrado'});
  }

  var query = {name:req.body.name, email:req.body.email};
    
    branch_company.find(query).exec()
    .then(function(data){
      if(data.length>0){
        return res.json({error:true,message:'Ya existe la sucursal'});        
      }
      var newBranchCompany = new branch_company({
          name : req.body.name,
          email : req.body.email,
          phone : req.body.phone,
          location : req.body.location,
          company:req.body.company
      });
      
      newBranchCompany.save(callback);

      function callback(err, doc){
        if(err)
          return res.json({error:true,message:err});
        return res.json({error:false, data:doc});
      };
    });
});

router.put('/brach-company', function(req, res, next){
    if(!req.user||!req.user.username){
      return res.json({error:true, message:'Usuario no encontrado'});
    }  
    var ObjectId = mongoose.Schema.Types.ObjectId;
		
		var query = { "_id" : new ObjectId(req.body._id) },			
			option = { upsert:true };
		
		branch_company.findOne(query, callback);

		function callback(err, doc){
			
			if(err || !doc){
				return res.json({ error:true, message:'No exite el documento' });
			}
			
			if(typeof req.body.name !== 'undefined')
				doc.reAssigned = req.body.name

			if(typeof req.body.email !== 'undefined')
				doc.email = req.body.email

			if(typeof req.body.phone !== 'undefined')
				doc.phone = req.body.phone

			if(typeof req.body.location !== 'undefined')
				doc.location = req.body.location

      if(typeof req.body.company !== 'undefined')
				doc.company = req.body.company

			doc.save();

			return res.json({ error:false, data:doc });
		};
});

router.post('/account', function(req, res, next){
  if(!req.user||!req.user.username){
    return res.json({error:true, message:'Usuario no encontrado'});
  }

  var query = {username:req.body.username};
    
    account.find(query).exec()
    .then(function(data){
      if(data.length>0){
        return res.json({error:true,message:'Ya existe el usuario'});        
      }
      var account = new account({
					name : req.body.name,
					username : user.username,
					password : utils.createHash(user.password, bCrypt),
					email : req.body.email,
					role : req.body.role,
          company : req.body.company
      });
      
      account.save(callback);

      function callback(err, doc){
        if(err)
          return res.json({error:true,message:err});
        return res.json({error:false, data:doc});
      };
    });
});

router.put('/account', function(req, res, next){
    if(!req.user||!req.user.username){
      return res.json({error:true, message:'Usuario no encontrado'});
    }  
    var ObjectId = mongoose.Schema.Types.ObjectId;
		
		var query = { "_id" : new ObjectId(req.body._id) },			
			option = { upsert:true };
		
		account.findOne(query, callback);

		function callback(err, doc){
			
			if(err || !doc){
				return res.json({ error:true, message:'No exite el documento' });
			}
			
			if(typeof req.body.name !== 'undefined')
				doc.reAssigned = req.body.name

			if(typeof req.body.role !== 'undefined')
				doc.role = req.body.role

			if(typeof req.body.company !== 'undefined')
				doc.company = req.body.company

			doc.save();

			return res.json({ error:false, data:doc });
		};
});

module.exports = router;
