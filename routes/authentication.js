var Express = require('express');
var Sanitizer = require('sanitizer');
var Mongoose = require('mongoose');
var MongoSanitize = require('mongo-sanitize');
var Csrf = require('csurf');
var Bcrypt = require('bcrypt-nodejs');

var Utils = require('../libs/utils');
var Log = require('../libs/log');
var SessionHandle = require('../libs/sessionHandle');

var router = Express.Router();
var csrfProtection = Csrf({ cookie: true });
var mongoAccount = Mongoose.model('account');

module.exports = function (passport) { 

  router.use(function (req, res, next) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    req.body = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.body))));
    req.params = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.params))));
    req.query = JSON.parse(Sanitizer.sanitize(JSON.stringify(MongoSanitize(req.query))));
    next();
  });

  router.get('/login', function (req, res) {
    res.render('pages/login', { 
      user: req.user || {}
    });
  });

  router.post('/login', function (req, res, next) {
    if (!req.body.username) {
      return res.redirect('/pages/failed-login');
    }
    
    req.body.username = req.body.username.toLowerCase();

    passport.authenticate('login', function (data) {
      if (data.error) { 
        return res.redirect('/login/failed-login');
      }
      var account = data.data;
      
      var newSession = SessionHandle.createSession(account);
      
      newSession
      .then(function(data){
        req.session._id=data[1].session;
        var obj={
          text: 'Inicio de sesion! '.concat('El Usuario ', account.name, ' inicio de sesion ', data[1].session),
          type:'create_session',
          user: account._id,
          model: JSON.stringify(data[1])
        };
        Log.debug(obj)
        .then(function(data){
          return res.redirect('/'.concat(account.role));
        });     
      })
      .catch(function(err){
        console.log(err)
      });

    })(req, res, next);
  });

  router.get('/login/:loginStatus', function (req, res) {
    if (req.params.loginStatus) {
      if (req.params.loginStatus === 'failed-login') {
        var message  = 'Usuario o contraseña errada. Favor intente nuevamente';
      }
      res.render('pages/login', { 
        user: req.user || {},
        showMessage: message
      });
    }
    else {
      res.render('pages/login', { 
        user: req.user || {}
      });
    }
  });

  router.get('/logout', SessionHandle.isLogged, function (req, res) { 
    var endSession = function(data){
      if(!data){
        Log.debug({
          text: 'Fin de sesion! '.concat('El Usuario ', req.user.name, ' finalizo sesion '),
          type: 'update_session',
          user: req.user._id    
        });
        req.session._id = null;
        req.user=null;
        req.logout();
        res.redirect('/login');
        return;
      }
    };

    SessionHandle.endSession(req.session._id, endSession);
  });

  router.get('/addMyAccount/:email', function (req, res, next) {
    req.body = {
      name: req.params.email.split('@')[0],
      email: req.params.email,
      role: 'admin',
      image:'https://octodex.github.com/images/octobiwan.jpg"'
    };

    var user = {
      username: req.params.email,
      password: '123456',
    };

    var query = {'username': user.username};

		Account.findOne(query, function (err, doc) {        
      if (err){
        res.json({'response': err});
        res.end();
      }

      if (doc) {
        res.json({'response': 'Usuario ya existe'});
        res.end();
      }
      else {
        var newUser = new Account();

        newUser.name = req.body.name;
        newUser.username = user.username;
        newUser.password = Utils.createHash(user.password);
        newUser.email = req.body.email;
        newUser.role = req.body.role;

        newUser.save(function (err) {
          if (err) {
            res.json({'response': ''.concat('Error al salvar! ', err)});
            res.end();
          }

          res.json({'response': 'ok'});
          res.end();
        });
      }
    });
  });

  return router;
};