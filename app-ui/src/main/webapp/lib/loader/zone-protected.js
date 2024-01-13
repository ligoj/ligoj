/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(['jquery', 'security.mod', 'cascade', 'error.mod', 'handlebars.mod', 'toastr.mod',
        'plugins/css', 'plugins/partial', 'plugins/i18n', 'plugins/html', 'plugins/js'], function ($, security, $cascade) {
	function decorate(session) {
	    var displayMode = session.applicationSettings && session.applicationSettings.data && session.applicationSettings.data['service:id:user-display'];
        var displayName = session.userName;
        if ((displayMode === 'mail' || displayMode == 'mail-no-domain') &&
                session.userSettings && session.userSettings.userDetails && session.userSettings.userDetails.mails && session.userSettings.userDetails.mails[0]) {
            var mail = session.userSettings.userDetails.mails[0];
            if (displayMode === 'mail-no-domain') {
                displayName = mail.split('@')[0];
            } else {
                displayName = mail;
            }
        }
        $('#_username').html(displayName + '<b class="caret"></b>');

		var version = session.applicationSettings.buildVersion;
		var $node = $('._version');
		$node.attr('href', ($node.attr('href') || '').replace('0.0.0', version.replace('-SNAPSHOT', '')))
				.text(version);
	}
	$.ajax({
		type: 'GET',
		url: REST_PATH + 'session',
		success: function (session) {
			$cascade.register('html', function (selector) {
				if (!selector.hasClass('select2-chosen') && !selector.hasClass('dataTables_paginate') && !selector.hasClass('dataTables_info')) {
					security.applySecurity(selector);
				}
			});
			$cascade.register('fragment-main', function () {
				decorate(session);
			});
			decorate(session);
			$cascade.session = session;

			// Update the digest version as needed
			if (session.applicationSettings && session.applicationSettings.digestVersion) {
				applicationManager.updateDigestUrlArgs(session.applicationSettings.digestVersion);
			}
			security.applySecurity(_('_main'));
			$cascade.trigger('session', _('_main'));
		}
	});
});
