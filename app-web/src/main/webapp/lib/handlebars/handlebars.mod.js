define(["handlebars/handlebars"], function() {
	// Register the length helper
	Handlebars.registerHelper('length', function(assignments) {
		return assignments.length;
	});
});
