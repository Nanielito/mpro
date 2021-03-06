var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var csrf = require('csurf');

var mongoose = require('mongoose');

var config = require('./config/configdb');
var utils = require('./libs/utils');

var mongooseConnection = utils.connectionDB(mongoose, config);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Database connection error:'));
db.once('open', console.error.bind(console, 'Connected to MongDB'));

require('./models/account');
require('./models/entity');

var index = require('./routes/index');
var initPassport = require('./config/passport')(passport);
var authentication = require('./routes/authentication')(passport);
var admin = require('./routes/admin');
var admin_company = require('./routes/admin_company');
var admin_branch_company = require('./routes/admin_branch_company');
var technical = require('./routes/technical');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false,  limit: '50mb' }));
app.use(cookieParser());

app.use(session({
    secret: 'mpro'
}));


app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

//app.use(csrf({ cookie: true }));

app.use('/', index);
app.use('/', authentication);
app.use('/', admin);
app.use('/', admin_company);
app.use('/', admin_branch_company);
app.use('/', technical);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});*/
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
