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
		 * @param {number} unit     The unit name. For sample : "$", "B", "o".
		 * @return {string}         Human readable string
		 */
		formatUnit: function (bytes, digits, sizes, unit, pow, format) {
			digits = Math.max(digits || 3, 2);
			if (bytes) {
				var s = sizes;
				var e = Math.floor(Math.log(bytes) / Math.log(pow));
				var value = bytes / Math.pow(pow, e);
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
				return Handlebars.compile(format)([value.toFixed(decimals).replace(/\.00/, ''), sizes[e], unit]);
			}
			return '';
		},

		/**
		 * Bytes to human readable string. Trailing decimal '0' are removed
		 * @param {number} bytes    The amount of bytes.
		 * @param {number} digits   Amount of digit. Default is 3 : When value is 3, you can get "6.23MB",  "62.2MB" or  "623MB".
		 *                          When value is 2 (minimal value), you can get "6.2MB", "62MB" or "0.6MB".
		 *                          When value is 4, you can get "6.234MB", "62.34MB" or "623.4MB".
		 * @return {string}         Human readable string
		 */
		formatCost: function (bytes, digits, currency) {
			return formatManager.formatUnit(bytes, digits, ['', 'K', 'M', 'B', 'T'], currency, 1000, messages['format-cost']);
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
			var unit = messages['unit-size'];
			return formatManager.formatUnit(bytes, digits, [unit, 'K' + unit, 'M' + unit, 'G' + unit, 'T' + unit, 'P' + unit], '', 1024, messages['format-size']);
		}
	};

	formatManager.messages = messages;
});
