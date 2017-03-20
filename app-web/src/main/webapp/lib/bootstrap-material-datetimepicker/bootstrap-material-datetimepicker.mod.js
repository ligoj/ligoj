define(['l10n.mod', 'i18n!bootstrap-material-datetimepicker/nls/locale', 'bootstrap-material-datetimepicker/bootstrap-material-datetimepicker', 'moment.mod'], function (l10n, messages) {
	$.fn.bootstrapMaterialDatePicker.defaults = {date: true, time: false, format: 'L', minDate: null, maxDate: null, currentDate: null, lang: l10n.requireLanguage, weekStart: 1, shortTime: false, clearButton: false, nowButton: false, cancelText: messages.cancel, okText: messages.ok, clearText: messages.clear, nowText: messages.now, switchOnClick: true, triggerEvent: 'focus'};

	var toOption = function ($this) {
		var options = $.extend({}, $.fn.bootstrapMaterialDatePicker.defaults);
		if ($this.data('format')) {
			options.format = $this.data('format');
		}
		if (typeof $this.data('time') !== 'undefined') {
			options.time = $this.data('time') !== false;
		}
		if (typeof $this.data('date') !== 'undefined') {
			options.date = $this.data('date') !== false;
		}
		options.weeks = true;
		options.week = true;

		return options;
	};

	/* DATEPICKER DATA-API
	 * ================== */
	$(document).off('.material-datepicker.data-api').on('focus.material-datepicker.data-api click.material-datepicker.data-api', '[data-provide="material-datepicker"]', function (e) {
		var $this = $(this).closest('[data-provide="material-datepicker"]');
		var $input = $this.is('input') ? $this : $this.find('input');
		if ($this.data('plugin_bootstrapMaterialDatePicker') || !$input.is(':enabled:not([readonly])')) {
			return;
		}
		e.preventDefault();
		$this.bootstrapMaterialDatePicker(toOption($this)).trigger('click');
	});
});
