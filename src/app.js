var Express = require('express');
var Path = require('path');
var Favicon = require('serve-favicon');
var Logger = require('morgan');
var CookieParser = require('cookie-parser');
var BodyParser = require('body-parser');

var Session = require('express-session');
var Passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Csrf = require('csurf');

var Mongoose = require('mongoose');

var DbConfig = require('../config/index');
var Utils = require('./libs/utils');

var mongooseConnection = Utils.getDbConnection(Mongoose, DbConfig.dbPath);
var db = Mongoose.connection;

db.on('error', console.error.bind(console, 'Database connection error:'));
db.once('open', console.error.bind(console, 'Connected to MongDB'));

require('./models/session');
require('./models/account');
require('./models/entity');
require('./models/equipmentType');
require('./models/equipment');
require('./models/maintenanceActivity');
require('./models/maintenanceActivityAttention');
require('./models/log');
require('./models/notification');

var api = require('./routes/api');
var index = require('./routes/index');
var initPassport = require('./passport')(Passport);
var authentication = require('./routes/authentication')(Passport);
var admin = require('./routes/admin');
var adminCompany = require('./routes/admin_company');
var adminBranchCompany = require('./routes/admin_branch_company');
var technician = require('./routes/technician');

var app = Express();

// view engine setup
app.set('views', Path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
  next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(Logger('dev'));

app.use(BodyParser.json({limit: '50mb'}));
app.use(BodyParser.urlencoded({extended: false, limit: '50mb'}));
app.use(CookieParser());

app.use(Session({
  secret: 'mpro'
}));

app.use(Express.static(Path.join(__dirname, 'public')));

app.use(Passport.initialize());
app.use(Passport.session());

//app.use(csrf({cookie: true}));

app.use('/', api);
app.use('/', index);
app.use('/', authentication);
app.use('/', admin);
app.use('/', adminCompany);
app.use('/', adminBranchCompany);
app.use('/', technician);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});*/
// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
