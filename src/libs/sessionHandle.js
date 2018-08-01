var Mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var sessionModel = Mongoose.model('session');

var sessionHandle = {
    createSession:function(user){
        return new Promise(function(resolve, reject){
            bcrypt.hash(user.username, null, null, function(err, hash) {
                var _session={
                    session:hash,
                    user:user._id,
                    active:1
                };
                
                var session_obj = new sessionModel(_session);
                
                var onCreateSesion=function(err, doc){                    
                    if(err) return reject([true, err])
                    return resolve([false, _session]);
                };

                session_obj.save(onCreateSesion);
            });
        });
    },
    endSession:function(session_id, done){
        var query = {session:session_id},
            update = {active:false},
            option = {upsert:true};

        var onUpdateSession = function (err, document) {
            if (err || !document) {
              return done(true);
            }

            return done(false);
        };
                
        sessionModel.findOneAndUpdate(query, update, option, onUpdateSession);

    },
    isLogged:function(req, res, next){
        var session_id=req.session._id;
        var validateSession = function(session){
            return new Promise(function(resolve, reject){

                var query = {session:session, active:true}
     
                var execSession = function(data, aux){
                    //code out handle time up
                    return resolve([false, data]);
                };

                var excceptionSession = function(err){
                    return reject([true, err]);
                };

                sessionModel
                    .findOne(query)
                    .populate({
                        path:'user',
                        model:'account',
                        populate:{
                            path:'company',
                            model:'entity',
                            populate:{
                              path:'company',
                              model:'entity'
                            }
                        }
                    })
                    .exec()
                    .then(execSession)
                    .catch(excceptionSession);
            });
        };
        validateSession(session_id)
        .then(function(data){            
            if(!data[0]&&data[1]!=null) {
                req.user=data[1].user;
            }            
            return next();
        });
    }
};

module.exports = sessionHandle;