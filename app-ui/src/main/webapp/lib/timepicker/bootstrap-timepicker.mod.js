define(['cascade', 'moment', 'bootstrap-timepicker', 'l10n.mod', 'moment.mod'], function ($cascade, moment) {
	var timePickerManager = {

		initialize: function () {
			// Look locale provided by MomentJs to check meridian
			var ltFormat = (moment && (typeof moment.localeData === 'function') && moment.localeData()._longDateFormat && moment.localeData()._longDateFormat.LT) || '';
			$.fn.timepicker.defaults.showMeridian = ltFormat.endsWith('A');
			$cascade.register('html', function (selector) {
				selector.find('input.time').timepicker();
			});

			/**
			 * Return the milliseconds corresponding to the time value. Manage meridian.
			 * @param time Optional parameter. When defined, set the time in millisecond.
			 */
			$.fn.timepickerTime = function (time) {
				if (typeof time === 'undefined') {
					// Get the time
					var timepickerData = $(this).data('timepicker');
					if (timepickerData && timepickerData.hour !== '') {
						// Add HMS
						var milli = timepickerData.hour * 3600 * 1000;
						milli += timepickerData.minute ? timepickerData.minute * 60 * 1000 : 0;
						milli += timepickerData.second ? timepickerData.second * 1000 : 0;

						// Add meridian hours
						milli += timepickerData.showMeridian && timepickerData.meridian === 'PM' ? 12 * 3600 * 1000 : 0;
						return milli;
					}

					return 0;
				}
				// Replace the time
				var momentTime = moment(time);
				if (momentTime.isValid()) {
					// Valid time
					$(this).timepicker('setTime', momentTime.format('LT'));
				} else {
					// Invalid time --> empty the field
					$(this).timepicker('setTime', null);
				}
			};
		}
	};
	timePickerManager.initialize();
	return timePickerManager;
});
