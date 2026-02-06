/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(['jquery', 'cascade', 'i18n!daterangepicker/nls/daterangepicker-messages', 'l10n.mod', 'bootstrap', 'bootstrap-datepicker.mod',
	'bootstrap-daterangepicker.core'
], function ($, $cascade, messages, locale) {
	var dateRangePickerManager = {

		options: {},

		initialize: function (messages) {
			dateRangePickerManager.options = {
				ranges: {},
				showWeekNumbers: true,
				format: formatManager.messages.shortDateMomentJs,
				locale: {
					applyLabel: messages.apply,
					clearLabel: messages.clear,
					fromLabel: messages.from,
					toLabel: messages.to,
					weekLabel: 'S', // TODO Support i18n there
					customRangeLabel: messages.other,
					daysOfWeek: $.fn.datepicker.dates[locale.requireLocale].daysMin.slice(0, 7),
					monthNames: $.fn.datepicker.dates[locale.requireLocale].months,
					firstDay: $.fn.datepicker.dates[locale.requireLocale].weekStart || 0
				}
			};
			$cascade.on('html:after', function (data) {
				// Ensure previous pop-ups are closed
				data.target.find('.modal').on('hidden', function () {
					$('.dropdown').removeClass('open');
				});
			});
		}
	};
	dateRangePickerManager.initialize(messages);
	window.dateRangePickerManager = dateRangePickerManager;
	return dateRangePickerManager;
});
