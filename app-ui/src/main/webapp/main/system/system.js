/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
/**
 * Manager used to populate and manage HTML selects
 */
define(function () {
	var current = {

		/**
		 * Populate Role combobox
		 * @param inputId Id of the input (default : 'role')
		 */
		populateRole: function (inputId) {
			inputId = inputId || 'role';
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'system/security/role',
				success: function (data) {
					var content = '';
					for (var idx = 0; idx < data.data.length; idx++) {
						content += '<option value="' + data.data[idx].id + '">' + data.data[idx].name + '</option>';
					}
					_(inputId).html(content);
				}
			});
		}
	};
	return current;
});
