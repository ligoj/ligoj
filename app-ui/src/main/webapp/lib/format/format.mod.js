define(['jquery', 'i18n!format/nls/format-messages', 'moment.mod'], function ($, messages) {
	formatManager = {
		messages: null,

		/**
		 * Get formated date.
		 * @param long timestamp. Null is accepted.
		 */
		formatDate: function (timestamp) {
			return timestamp ? moment(timestamp).format('L') : '';
		},

		/**
		 * Get formated date time.
		 * @param long timestamp. Null is accepted.
		 */
		formatDateTime: function (timestamp) {
			return timestamp ? moment(timestamp).format('L LT') : '';
		},

		/**
		 * Bytes to human readable string. Trailing decimal '0' are removed
		 * @param {number} bytes           The amount of bytes.
		 * @param {number} digits          Amount of digit. Default is 3 : When value is 3, you can get "6.23MB",  "62.2MB" or  "623MB".
		 *                                 When value is 2 (minimal value), you can get "6.2MB", "62MB" or "0.6MB".
		 *                                 When value is 4, you can get "6.234MB", "62.34MB" or "623.4MB".
		 * @param {number} unit            The unit name. For sample : "$", "B", "o".
		 * @param {number} pow             The 1K value. For samples : 1000 or 1024.
		 * @param {string|function} format Either the format used to build the final value accepting an array having this structure : [ value, power, unit].
		 *                                 For sample : [1.23, 'M','£']. Either the callback function. 
		 *                                 When defined, this callback receive "value", "weight", "unit" parameters.
		 * @param {string} clazz           Optional class to apply to unit. ay be null.
		 * @return {string}                Human readable string
		 */
		formatUnit: function (bytes, digits, sizes, unit, pow, format, clazz) {
			bytes = (Math.round(bytes * pow) / pow) || 0;
			digits = Math.max(digits || 3, 2);
			if (bytes) {
				var s = sizes;
				var e = Math.max(0, Math.floor(Math.log(bytes) / Math.log(pow)));
				var decimals;
				var value;
				if (e <= 1 && bytes < 10 * pow) { 
					// No need to format
					decimals = 0;
					e = 0;
					value = bytes;
				} else {
					value = bytes / Math.pow(pow, e);
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
				}
				value = value.toFixed(decimals).replace(decimals === 1 ? /\.0/ : /\.00/, '');
				if (typeof format === 'function') {
					format(value, sizes[e], unit);
				} else {
					return Handlebars.compile(format)({
						value : value,
						weight: sizes[e],
						unit: unit,
						preUnit: clazz ? '<span class="' + clazz +'">' : '',
						postUnit: clazz ? '</span>' : '',
					});
				}
			}
			return '';
		},

		/**
		 * Bytes to human readable string. Trailing decimal '0' are removed
		 * @param {number} bytes           The amount of bytes.
		 * @param {number} digits          Amount of digit. Default is 3 : When value is 3, you can get "6.23MB",  "62.2MB" or  "623MB".
		 *                                 When value is 2 (minimal value), you can get "6.2MB", "62MB" or "0.6MB".
		 *                                 When value is 4, you can get "6.234MB", "62.34MB" or "623.4MB".
		 * @param {string} clazz           Optional class to apply to unit. ay be null.
		 * @param {string|function} format Either the format used to build the final value accepting an array having this structure : [ value, power, unit].
		 *                                 For sample : [1.23, 'M','£']. Either the callback function. 
		 *                                 When defined, this callback receive "value", "weight", "unit" parameters.
		 * @return {string}                Human readable string.
		 */
		formatCost: function (bytes, digits, currency, clazz, format) {
			return formatManager.formatUnit(bytes, digits, ['', 'K', 'M', 'B', 'T'], currency, 1000, format || messages['format-cost'], clazz);
		},

		/**
		 * Bytes to human readable string. Trailing decimal '0' are removed
		 * @param {number} bytes    The amount of bytes.
		 * @param {number} digits   Amount of digit. Default is 3 : When value is 3, you can get "6.23MB",  "62.2MB" or  "623MB".
		 *                          When value is 2 (minimal value), you can get "6.2MB", "62MB" or "0.6MB".
		 *                          When value is 4, you can get "6.234MB", "62.34MB" or "623.4MB".
		 * @param {string} clazz    Optional class to apply to unit. ay be null.
		 * @return {string}         Human readable string.
		 */
		formatSize: function (bytes, digits, clazz) {
			var unit = messages['unit-size'];
			return formatManager.formatUnit(bytes, digits, [unit, 'K' + unit, 'M' + unit, 'G' + unit, 'T' + unit, 'P' + unit], '', 1024, messages['format-size'], clazz);
		}
	};

	formatManager.messages = messages;
});
