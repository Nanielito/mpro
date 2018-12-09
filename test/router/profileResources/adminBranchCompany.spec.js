var assert = require('assert');
var lodash = require('lodash');
var data = require('./activities');


describe('Activities', function(){
    
    it('activities', function(){
        var result=[], lastIndex=0;

        lodash.forEach(data, function(element, i) {
            var exist = lodash.filter(result, function(o) { 
                return o._id == element.equipment._id && o.date == element.equipment.date; 
            });
            if(!exist.length) {
                element.equipment['attentions']=[];
                result.push(element.equipment);
            }
            result[result.length-1].attentions.push(element);
        });
        assert(result.length);
    });

});