var Express = require('express');
var Mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var Bcrypt = require('bcrypt-nodejs');

var router = Express.Router();
var mongoAccount = Mongoose.model('account');

var user = {};

module.exports = function (passport) {
	var isValidPassword = function (doc, password) {		
		return Bcrypt.compareSync(password, doc.password);
	};

	var createHash = function (password) {
		return Bcrypt.hashSync(password, Bcrypt.genSaltSync(10), null);
	};

	passport.serializeUser(function (user, done) {
		//console.log('usuario serializado: ' + user );
		return done(null, user);
	});

	passport.deserializeUser(function (id, done) {
		mongoAccount.findById(id, function(err, doc) {			
			return done(err, doc);
		});
	});

	passport.use('login', new LocalStrategy({passReqToCallback: true}, function (req, username, password, done) {
		var query = {'username': username, 'status': true};
	
		mongoAccount.findOne(query)
		.populate({
			path:'company',
			model:'entity',
			populate:{
			  path:'company',
			  model:'entity'
			}
		})
		.exec(callback);

		function callback(err, doc) {			
			if (err) {
				return done({error: true, data: false, message: err});
			}

			if (!doc) {
				return done({error: true, data: false, message: 'No existe el usuario'});
			}

			if(isValidPassword(doc, password) === false) {
				return done({error: true, data: false, message: 'Usuario o password errado!'});
			}

			return done({error: false, data: doc, message: 'Exito!'});
		};
	}));

	passport.use('signup', new LocalStrategy({passReqToCallback: true}, function (req, username, password, done) {
		var query = {'username': username};

		mongoAccount.findOne(query, function (err, doc) {
			if (err) {
				console.log('ERROR:', error);
				return done(true, null, 'error');
			}

			if (doc) {
				console.log('Usuario ya existe');
				return done(true, null, 'Usuario ya existe');
			}
			else {
				var newUser = new account();

				newUser.name = req.body.name;
				newUser.username = username;
				newUser.password = createHash(password);					
				newUser.email = req.body.email;
				newUser.role = req.params.role;

				if (typeof req.body.company !== 'undefined') {
					newUser.company = req.body.company;
				}
				
				newUser.save(function (err) {
					if (err) {
						done(true, null, 'Error al salvar!');
					}
		
					return done(false, newUser, 'success');
				});
			}
		});
	}));

	return router;
};