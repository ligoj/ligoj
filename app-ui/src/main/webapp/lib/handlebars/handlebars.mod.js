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
        YYYY : d => new Date().getFullYear(),
        MM : d => new Date().getMonths()+1,
        dd : d => new Date().getDate(),
        HH : d => new Date().getHours(),
        mm : d => new Date().getMinutes()
	};
	Handlebars.registerHelper('date', function(format) {
        return (format && moment)
        ? moment(new Date()).format(format)
        : (format && SIMPLE_FORMATS[format](new Date()) || new Date().toISOString());
	});
});
