/**
 * The JS file will be loaded and "initialize" function if defined will be called. When this
 * function is called, view is already placed in the document, CSS is loaded, and "$current"
 * context fully built with all components injected.
 * This function will also receive the non consumed URL fragments array that could be
 * considered as parameters.
 */
define([], function () {
	var current = {
		load: {
			require: function (options) {
				return options.home + '/' + options.id;
			}
		},
		unload: {
			controller: requirejs.undef
		}
	};
	return current;
});
