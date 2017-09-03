var Express = require('express');
var Sanitizer = require('sanitizer');
var Mongoose = require('mongoose');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');
var ObjectId = require('mongoose').Types.ObjectId;
var Functional = require('underscore');

var router = Express.Router();
var csrfProtection = Csrf({ cookie: true });
var mongoAccount = Mongoose.model('account');
var mongoEntity = Mongoose.model('entity');
var mongoEquipmentType = Mongoose.model('equipmentType');

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.user) {
    if (req.session.loginPath) {
      res.redirect(req.session.loginPath);
    }
    else {
      console.log('RES:\n\t', JSON.stringify(res))
      if (res.user.role.role === 'admin') {
        res.redirect(''.concat('/admin/', req.user.nickname));
      }
    }
  }
  else {
    res.render('pages/login', { 
      //csrfToken: req.csrfToken(),
      user: {}
    });
  }
});

router.get('/home/:identifier/company/:id', function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('No identifier');
    res.redirect('/login');
  }

  var companyPromise = new Promise(function (resolve, reject) {
    var query = {_id: req.params.id, type: 'company'};

    mongoEntity.findOne(query).exec()
    .then(function (company) {
      if (!company || company.length === 0) {
        var message = 'No company found';
        reject(new Error(message));
      }
      else {      
        var identifiers = [];

        if (req.user.role === 'admin') {
          identifiers.push(company._id);
        }

        resolve([company, identifiers]);
      }
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var onFetchBranchCompanies = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var query = {type: 'branch_company', company: new ObjectId(data[0]._id)};
      
      mongoEntity.find(query).exec()
      .then(function (branchCompanies) {
        data[1] = Functional.reduce(branchCompanies, function (accumulator, branchCompany) {
          accumulator.push(branchCompany._id);

          return accumulator;
        }, data[1]);
        
        data.push(branchCompanies);

        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  }

  var onFetchAccounts = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var query = {company: {$in: data[1]}};

      mongoAccount.find(query).exec()
      .then(function (users) {
        data.push(users);

        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  }

  var onRender = function (data) {
    return res.render('pages/entity', {
      user: req.user || {},
      entity: data[0] || [],
      entitiesRelated: data[2] || [],
      accounts: data[3]
    });
  }

  companyPromise
  .then(onFetchBranchCompanies)
  .then(onFetchAccounts)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
});

router.get('/home/:identifier/branch_company/:id', function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('No identifier');
    res.redirect('/login');
  }

  var branchCompanyPromise = new Promise(function (resolve, reject) {
    var query = {_id: req.params.id, type: 'branch_company' };
  
    mongoEntity.findOne(query).exec()
    .then(function (branchCompany) {
      if (!branchCompany || branchCompany.length === 0) {
        var message = 'No branch company found';
        reject(new Error(message));
      }
      else {
        resolve([branchCompany]);
      }
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var onFetchAccounts = function (data) {
    var promise = new Promise(function (resolve, reject) {
      var query = {company: data[0]._id};

      mongoAccount.find(query).exec()
      .then(function (accounts) {
        data.push(accounts);

        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
    });

    return promise;
  };

  var onRender = function (data) {
    return res.render('pages/entity', {
      user: req.user || {},
      entity: data[0] || [],
      entitiesRelated: [],
      accounts: data[1]
    });
  };

  branchCompanyPromise
  .then(onFetchAccounts)
  .then(onRender)
  .catch(function (err) {
    console.log('ERROR:', err);
    res.redirect('/');
    return;
  });
});

router.get('/get-branch-companies-by-company/:company', function (req, res, next) {
  var branchCompaniesPromise = new Promise(function (resolve, reject) {
    var query = {type: 'branch_company', company: new ObjectId(req.params.company)};

    mongoEntity.find(query).populate('company').exec()
    .then(function (branchCompanies) {
      resolve(branchCompanies);
    })
    .catch(function (err) {
      reject(err);
    });
  });
  
  branchCompaniesPromise
  .then(function (branchCompanies) {
    return res.json({error: false, data: branchCompanies});
  })
  .catch(function (err) {
    return res.json({error: true, message: err});
  });
});

router.get('/get-equipment-types-by-company/:company', function (req, res, next) {
  var equipmentTypesPromise = new Promise(function (resolve, reject) {
    var query = {company: new ObjectId(req.params.company)};

    mongoEquipmentType.find(query).exec()
    .then(function (equipmentTypes) {
      resolve(equipmentTypes);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  equipmentTypesPromise
  .then(function (equipmentTypes) {
    return res.json({error: false, data: equipmentTypes});
  })
  .catch(function (err) {
    return res.json({error: true, message: err});
  });
});

router.get('/get-technicians-by-company/:company', function (req, res, next) {
  var branchCompaniesPromise = new Promise(function (resolve, reject) {
    var query = {type: 'branch_company', company: new ObjectId(req.params.company)};

    mongoEntity.find(query).exec()
    .then(function (branchCompanies) {
      resolve(branchCompanies);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  var onFetchAccounts = function (branchCompanies) {
    var branchCompanyIds = Functional.reduce(branchCompanies, function (accumulator, branchCompany) {
      accumulator.push(branchCompany._id);
      return accumulator;
    }, []);

    var promise = new Promise(function (resolve, reject) {
      var query = {role: 'technical', company: {$in: branchCompanyIds}};

      mongoAccount.find(query).exec()
      .then(function (accounts) {
        resolve(accounts);
      })
      .catch(function (err) {
        reject(err);
      });
    });
    
    return promise;
  };

  branchCompaniesPromise
  .then(onFetchAccounts)
  .then(function (accounts) {
    return res.json({error: false, data: accounts});
  })
  .catch(function (err) {
    return res.json({error: true, message: err});
  });
});

router.get('/get-technicians-by-branch-company/:branchCompany', function (req, res, next) {
  var accountsPromise = new Promise(function (resolve, reject) {
    var query = {role: 'technical', company: new ObjectId(req.params.branchCompany)};

    mongoAccount.find(query).exec()
    .then(function (accounts) {
      resolve(accounts);
    })
    .catch(function (err) {
      reject(err);
    });
  });

  accountsPromise
  .then(function (accounts) {
    return res.json({error: false, data: accounts});
  })
  .catch(function (err) {
    return res.json({error: true, message: err});
  });
});

router.get('/account/:identifier', function (req, res, next) {
  if (!req.user) {
    req.session.loginPath = null;
    console.log('no identifier');
    res.redirect('/login');
  }

  var query = {identifier: req.params.identifier};

  function onFetchAccount(err, data) {
    if (err) {
      //redireccionar a un router escribiendo el error, por ahora
      data = [];
    }

    return res.render('pages/account-home', {
      user: req.user || {},        
      account: data
    });

  mongoAccount.findOne(query).populate('company').exec(onFetchAccount);
  };
});

module.exports = router;
