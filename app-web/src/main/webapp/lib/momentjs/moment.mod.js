define(['moment', 'l10n.mod','moment/locale/fr'], function (momentjs) {
	momentManager = {
		locales: ['fr', 'en'],
		locale: 'en',

		initialize: function () {
			if ($.inArray(localeManager.navigatorLocale, momentManager.locales) >= 0) {
				momentManager.locale = localeManager.navigatorLocale;
			} else if ($.inArray(localeManager.requireLanguage, momentManager.locales) >= 0) {
				momentManager.locale = localeManager.requireLanguage;
			}
			momentjs.locale(momentManager.locale);
			moment = momentjs;
		},

		/**
		 * Format a duration h,m,s from milliseconds. Minutes are displayed even when 0 while positive hours and seconds.
		 */
		duration: function (time) {
			var duration = moment.duration(time),
				seconds = duration.seconds(),
				minutes = duration.minutes(),
				hours = Math
				.floor(duration.asHours()),
				result = [];

			if (hours) {
				result.push(hours + 'h');
			}
			if (minutes || (seconds && hours)) {
				result.push(minutes + 'm');
			}
			if (seconds) {
				result.push(seconds + 's');
			}
			return result.join(' ');
		},

		/**
		 * Format a time HH:mm ss from milliseconds. Minutes are displayed even when 0 while positive hours and seconds.
		 */
		time: function (time) {
			var hour = Math.floor(time / 3600000);
			var minute = Math.floor((time % 3600000) / 60000);
			var second = Math.floor((time % 60000) / 1000);
			var result = '';
			if (hour > 9) {
				result += hour;
			} else {
				result += '0' + hour;
			}
			result += ':';
			if (minute > 9) {
				result += minute;
			} else {
				result += '0' + minute;
			}
			if (second > 9) {
				result += ' ' + second;
			} else if (second > 0) {
				result += ' 0' + second;
			}
			return result;
		}

	};
	momentManager.initialize();
	return momentManager;
});
