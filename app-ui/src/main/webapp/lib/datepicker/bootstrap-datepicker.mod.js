/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(['i18n!datepicker/nls/bootstrap-datepicker', 'l10n.mod', 'bootstrap-datepicker.core', 'format.mod'], function (messages, locale) {
	$.fn.datepicker.dates[locale.requireLocale] = messages;
	$.fn.datepicker.defaults = $.extend($.extend({}, $.fn.datepicker.defaults), {
		language: locale.requireLocale,
		format: messages.format,
		weekStart: messages.weekStart,
		todayBtn: 'linked',
		todayHighlight: true,
		autoclose: true,
		calendarWeeks: true
	});
	var toOption = function ($this) {
		var options = $.extend({}, $.fn.datepicker.defaults);
		if ($this.data('dateFormat')) {
			options.format = $this.data('dateFormat');
		}
		if ($this.data('dateAutoclose')) {
			options.autoclose = $this.data('dateAutoclose') === 'true';
		}
		if ($this.data('dateTodaybtn')) {
			options.todayBtn = $this.data('dateTodaybtn');
		}
		if ($this.data('dateCalendarweeks')) {
			options.dateCalendarWeeks = $this.data('dateCalendarweeks') === 'true';
		}
		if ($this.data('dateMinviewmode')) {
			options.minViewMode = $this.data('dateMinviewmode');
		}
		return options;
	};

	/* DATEPICKER DATA-API
	 * ================== */
	$(document).off('.datepicker.data-api').on('focus.datepicker.data-api click.datepicker.data-api', '[data-provide="datepicker"]', function (e) {
		var $this = $(this).closest('[data-provide="datepicker"]');
		var $input = $this.is('input') ? $this : $this.find('input');
		if ($this.data('datepicker') || !$input.is(':enabled:not([readonly])')) {
			return;
		}
		e.preventDefault();
		// component click requires us to explicitly show it
		$this.datepicker(toOption($this)).datepicker('show');
	}).on('focus.datepicker.data-api click.datepicker.data-api', '[data-provide="daterange"] input:enabled:not([readonly])', function (e) {
		var $this = $(this).closest('[data-provide="daterange"]');
		if ($this.data('datepicker')) {
			return;
		}
		e.preventDefault();
		// component click requires us to explicitly show it
		$this.addClass('input-daterange').datepicker(toOption($this)).datepicker('show');
	});
});
