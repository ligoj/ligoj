define(['jquery', 'i18n!format/nls/format-messages', 'moment.mod'], function ($, messages) {
	formatManager = {
		messages: null,

		/**
		 * get formated date
		 * @param long timestamp
		 */
		formatDate: function (timestamp) {
			return timestamp ? moment(timestamp).format('L') : '';
		},

		/**
		 * Bytes to human readable string. Trailing decimal '0' are removed
		 * @param {number} bytes    The amount of bytes.
		 * @param {number} digits   Amount of digit. Default is 3 : When value is 3, you can get "6.23MB",  "62.2MB" or  "623MB".
		 *                          When value is 2 (minimal value), you can get "6.2MB", "62MB" or "0.6MB".
		 *                          When value is 4, you can get "6.234MB", "62.34MB" or "623.4MB".
		 * @return {string}         Human readable string
		 */
		formatSize: function (bytes, digits) {
			digits = Math.max(digits || 3, 2);
			if (bytes) {
				var s = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
				var e = Math.floor(Math.log(bytes) / Math.log(1024));
				var value = bytes / Math.pow(1024, e);
				var decimals;
				if (value >= 100 && digits < 3) {
					// Need to shift to the upper power
					value /= 1024;
					e++;
					decimals = 2;
				} else if (value >= 100) {
					decimals = digits - 3;
				} else if (value >= 10) {
					decimals = digits - 2;
				} else {
					decimals = digits - 1;
				}
				return value.toFixed(decimals).replace(/\.00/, '') + ' ' + s[e];
			}
			return '';
		}
	};

	formatManager.messages = messages;
});
