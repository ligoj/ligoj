define(['toastr'], function (toastr) {
	notifyManager = {

		/**
		 * Using notification feature, display a non closable danger message.
		 * @param text text message.
		 * @param html Optional HTML message bellow the title
		 */
		notifyDanger: function (html, title) {
			notifyManager.notify(html, title, 'error');
		},

		/**
 		 * Remove  all notificaions
 		 */
		clear: function () {
			toastr.clear();
		},

		/**
		 * Return the icon markup to associate with the given message type.
		 * @param  {string} type Message type.
		 * @return {string}      html markup of icon.
		 */
		typeToIcon: function (type) {
			type = notifyManager.getTypeFromBusiness(type);
			if (type === 'danger' || type === 'error') {
				return '<i class=" fa fa-meh-o "></i> ';
			}
			if (type === 'warning') {
				return '<i class=" fa fa-warning "></i> ';
			}
			if (type === 'info') {
				return '<i class=" fa fa-info "></i> ';
			}
			if ((typeof type) === 'undefined' || type === 'success') {
				return '<i class=" fa fa-thumbs-up "></i> ';
			}
			return '';
		},

		/**
		 * Display a message as a notification.
		 * @param text message content.
		 * @param [optional] type 'success' (default), 'info', 'warning', 'danger', 'inverse'.
		 * @see http://nijikokun.github.com/bootstrap-notify/
		 */
		notify: function (text, title, type, position, forever) {
			var options = {
				'closeButton': !forever,
				'newestOnTop': true,
				'progressBar': true,
				'positionClass': position || 'toast-bottom-right',
				'preventDuplicates': false,
				'showDuration': '300',
				'hideDuration': '300',
				'iconClass': 'toastr-custom alert alert-' + ((type === 'error' ? 'danger' : type) || 'info'),
				'timeOut': forever || (type === 'error' ? '20000' : '2000'),
				'extendedTimeOut': forever || '2000',
				'showEasing': 'swing',
				'hideEasing': 'swing',
				'showMethod': 'fadeIn',
				'hideMethod': 'fadeOut'
			};
			toastr[type || 'info'](notifyManager.typeToIcon(type) + text, title, options);
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
					return 'error';
				default:
					return businessType;
			}
		}
	};
	return notifyManager;
});
