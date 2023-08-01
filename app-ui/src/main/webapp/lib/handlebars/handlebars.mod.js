/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
var Handlebars;
define(["handlebars/handlebars"], function(handlebars) {
	// Register the length helper
	Handlebars = Handlebars || handlebars;
	Handlebars.registerHelper('length', function(assignments) {
		return assignments.length;
	});
	var SIMPLE_FORMATS  = {
        YYYY : function(d) { return new Date().getFullYear();},
        MM : function(d) { return new Date().getMonths()+1;},
        dd : function(d) { return new Date().getDate();},
        HH : function(d) { return new Date().getHours();},
        mm : function(d) { return new Date().getMinutes();}
	};
	Handlebars.registerHelper('date', function(format) {
        if (typeof format === 'string') {
            return (moment && moment(new Date()).format(format)) || (SIMPLE_FORMATS[format] && SIMPLE_FORMATS[format](new Date())) || new Date().toISOString();
        }
        return new Date().toISOString();
    });
});
