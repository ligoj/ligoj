define(['bootstrap-notify'], function () {
	notifyManager = {

		/**
		 * Using notification feature, display a non closable danger message.
		 * @param text text message.
		 * @param html Optional HTML message bellow the title
		 */
		notifyDanger: function (title, html) {
			notifyManager.notify('<b>' + title + '</b>' + (html ? '<br/>' + html : ''), '.top-right', 'danger');
		},

		/**
		 * Return the icon markup to associate with the given message type.
		 * @param  {string} type Message type.
		 * @return {string}      html markup of icon.
		 */
		typeToIcon: function (type) {
			type = notifyManager.getTypeFromBusiness(type);
			if (type === 'danger') {
				return '<i class="fa fa-meh-o"></i> ';
			}
			if (type === 'warning') {
				return '<i class="fa fa-warning"></i> ';
			}
			if (type === 'info') {
				return '<i class="fa fa-info"></i> ';
			}
			if ((typeof type) === 'undefined' || type === 'success') {
				return '<i class="fa fa-thumbs-up"></i> ';
			}
			return '';
		},

		/**
		 * Display a message as a notification.
		 * @param text message content.
		 * @param [optional] selector 'bottom-right' (default), 'top-right'
		 * @param [optional] type 'success' (default), 'info', 'warning', 'danger', 'inverse'.
		 * @see http://nijikokun.github.com/bootstrap-notify/
		 */
		notify: function (text, selector, type) {
			selector = selector || '.bottom-right';
			$().notify && $(selector).notify({
				message: {
					html: notifyManager.typeToIcon(type) + text
				},
				fadeOut: {
					enabled: (type !== 'danger' && type !== 'inverse'),
					delay: ((type === 'danger' || type === 'inverse') ? 0 : 5000)
				},
				type: type
			}).show();
		},

		/**
		 * Return the bootstrap notification type from the business type.
		 * @param businessType the business message type.
		 * @return the bootstrap alert type.
		 */
		getTypeFromBusiness: function (businessType) {
			switch (businessType) {
			case 'business':
				return 'warning';
			case 'technical':
			case 'internal':
				return 'danger';
			default:
				return businessType;
			}
		}
	};
	return notifyManager;
});
