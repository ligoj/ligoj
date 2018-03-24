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
});
