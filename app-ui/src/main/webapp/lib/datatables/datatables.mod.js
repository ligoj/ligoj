/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'jquery', 'cascade', 'i18n!datatables/nls/messages', 'datatables.net-buttons-bs', 'datatables.net-filters', 'datatables.net-edit', 'datatables.net-buttons-colvis'
], function ($, $cascade, dataTablesMessages) {
	var DataTable = $.fn.dataTable;
	$.extend(DataTable.defaults.oLanguage, dataTablesMessages);
	DataTable.ext.errMode = 'throw';

	// Triggering a filter on the table from given value
	$.fn.dataTableExt.oApi.fnFilter = function (oSettings, val) {
		var oPreviousSearch = oSettings.oPreviousSearch;
		if (val !== oPreviousSearch.sSearch) {
			this._fnFilterComplete({sSearch: val, bRegex: oPreviousSearch.bRegex, bSmart: oPreviousSearch.bSmart, bCaseInsensitive: oPreviousSearch.bCaseInsensitive}, true);
		}

		// Need to redraw, without resorting
		oSettings._iDisplayStart = 0;
		this._fnDraw();
	};

	$.extend(DataTable.defaults, {
		bFilter: false,
		searching: false,
		ordering: true,
		autoWidth: false,
		lengthChange: false,

		// Call this method from 'fnRowCallback' if you redefine it.
		super_fnRowCallback: function (nRow) {
			$cascade.trigger('html', $(nRow));
		},

		// By default, call super method
		fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
			DataTable.defaults.super_fnRowCallback(nRow, aData, iDisplayIndex, iDisplayIndexFull);
		}
	});

	DataTable.ext.legacy.ajax = false;
	$.extend(DataTable.defaults.column, {
		defaultContent: '',
		searchable: true
	});
});
