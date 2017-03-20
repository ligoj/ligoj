/**
 * Manager used to populate and manage HTML selects
 */
define({

	/**
	 * Populate Role combo box
	 * @param inputId Id of the input (default : 'role')
	 */
	populateRole: function (inputId) {
		inputId = (inputId ? inputId : 'role');
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

});
if (typeof securityManager !== 'undefined') {
	securityManager.applySecurity();
}
