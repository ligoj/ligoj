/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'cascade', 'material'
], function ($cascade) {
	var current = {
		/**
		 * Update the message counter.
		 */
		initialize: function () {
			var options = {
				'validate': true,
				'input': true,
				'ripples': true,
				'ripplesDelegate': true,
				'checkbox': true,
				'togglebutton': true,
				'radio': true,
				'arrive': true,
				'autofill': false,
				'inputElements': 'input.form-control, textarea.form-control, select.form-control',
				'checkboxElements': '.checkbox > label > input[type=checkbox], label.checkbox-inline > input[type=checkbox]',
				'togglebuttonElements': '.togglebutton > label > input[type=checkbox]',
				'radioElements': '.radio > label > input[type=radio], label.radio-inline > input[type=radio]'
			};
			$.material.init(options);
			$cascade.on('html:after', function (data) {
				$.material.input(data.target.find(options.inputElements));
				$.material.checkbox(data.target.find(options.checkboxElements));
				$.material.togglebutton(data.target.find(options.togglebuttonElements));
				$.material.radio(data.target.find(options.radioElements));
			});
		}
	};
	current.initialize();
	return current;
});
