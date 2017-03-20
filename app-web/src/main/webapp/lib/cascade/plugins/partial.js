/**
 * The HTML file will be loaded, compiled and placed in the context.
 */
define([], function () {
	var $self = {
		load: {
			require: function (options) {
				return 'text!' + options.home + '/' + options.id + '.html';
			},
			controller: function (template, options, $current) {
				$current.$template = template && Handlebars.compile(template);
				$current.$view = $(template ? $current.$template($current.$messages || options.context.$messages || {}) : '');
			}
		}
	};
	return $self;
});
