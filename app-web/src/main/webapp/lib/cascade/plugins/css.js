/**
 * The CSS file will be loaded and placed in the head of the document and will be removed
 * during the unload. Unfortuanately, "scoped" attribute is not yet implemented in the major browser.
 * See https://github.com/whatwg/html/issues/1605
 */
define([], function () {
	var $self = {
		load: {
			require: function (options) {
				return 'css!' + options.home + '/' + options.id;
			}
		},
		unload: {
			controller: function (module) {
				requirejs.undef(module);
				// Also remove the link from the head since RequireJs does not support it
				$('link[data-requiremodule="' + module.substr(4) + '"]').remove();
			}
		}
	};
	return $self;
});
