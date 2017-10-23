var dataTableFilterManager;
define([
	'jquery', 'datatables.net-buttons-bs', 'moment.mod'
], function ($) {
	var self = {

		/**
		 * Add the group filter to the root filter and return the new group object without rule.
		 */
		addGroupFilter: function (oSettingsOrParent, op) {
			var newGroup = {
				type: 'group',
				groupOp: op.toLowerCase(),
				rules: []
			};
			if (oSettingsOrParent.rules) {
				// This is an intermediate group filter : add the rule to this group
				oSettingsOrParent.rules.push(newGroup);
			} else if (oSettingsOrParent.filters) {
				// This is a dataTables 'oSettings' : add the rule at the root group
				oSettingsOrParent.filters.rules.push(newGroup);
			} else {
				// This is a fresh dataTables 'oSettings' without filter, add a new one with this
				oSettingsOrParent.filters = newGroup;
			}
			return newGroup;
		},

		/**
		 * Add a filter to the given group
		 */
		addFilter: function (oSettings, field, op, data) {
			// Filter only non null values
			if (data !== undefined && data !== null && data !== '') {
				if (oSettings.fnSettings) {
					oSettings = oSettings.fnSettings();
				}

				// Get or build the root group
				(oSettings.filters || self.addGroupFilter(oSettings, 'and')).rules.push({field: field, op: op, data: data});
			}
		},

		resetFilters: function (dataTable) {
			dataTable.fnSettings().filters = null;
		},

		addVariableInDataTableJsCall: function (aoData, name, value) {
			aoData.push({'name': name, 'value': value});
		},

		addCustomFilter: function (masterFilter, selector, mapping) {
			selector.each(function () {
				var $input = $(this),
					field,
					op,
					value = $input.val();
				if (value !== undefined && value !== null && value !== '') {
					field = $input.closest('[id]').attr('id').toProperty();
					if (mapping && (typeof mapping[field]) === 'function') {
						// A manual mapping is defined
						mapping[field](masterFilter, value, self);
						return;
					} else if (mapping && (typeof mapping[field]) === 'string') {
						// A simple field name override
						field =  mapping[field];
					}

					// Convention mapping
					if ($input.data('select2')) {
						var data = $input.data('select2');
						if (data.opts && data.opts.multiple && value.indexOf(',') !== -1) {
							// Multiple joins with OR
							var orFilter = self.addGroupFilter(masterFilter, 'or');
							var values = value.split(','),
								index;
							for (index = 0; index < values.length; index++) {
								orFilter.rules.push({op: 'eq', data: values[index], field: field});
							}
							return;
						}
						// Join
						op = 'eq';
					} else if ($input.is('select')) {
						// Join
						op = 'eq';
					} else if ($input.parent().is('.date')) {
						// Date, minimal date
						op = 'eq';
						value = moment(value, formatManager.messages.shortdateMomentJs).startOf('day').valueOf();
					} else if ($input.parent().is('.input-daterange')) {
						// Date range
						op = $input.index() ? 'lte' : 'gte';
						field = $input.parent().is('[id]') ? $input.parent().attr('id').toProperty() : field;
						value = moment(value, formatManager.messages.shortdateMomentJs)[$input.index() ? 'endOf' : 'startOf']('day').valueOf();
					} else {
						// Textual value
						op = 'cn';
					}
					self.addFilter(masterFilter, field, op, value);
				}
			});
		},

		/**
		 * Fill all filter inputs from the given data.
		 */
		fillFilters: function (data, selector) {
			selector.not(".select2-offscreen").each(function () {
				var $input = $(this),
					field,
					op,
					id = $input.attr('id');
				if (id) {
					id = id.toProperty();
					if ($input.data('select2')) {
						$input.select2('data', data[id] || null);
					} else if ($input.is('select')) {
						if (typeof data[id] === 'undefined') {
							$input.val(null);
						} else if (typeof data[id].id === 'undefined') {
							$input.val(data[id]);
						} else {
							$input.val(data[id].id);
						}
					} else if ($input.is('.date') || $input.parent().is('.date')) {
						$input.val(moment(data[id]).format(formatManager.messages.shortdateMomentJs));
					} else {
						$input.val(data[id]);
					}
				}
			});
		},

		addFilterData: function (sSource, aoData, callback, oSettings) {
			var table = oSettings.oInstance;
			var rows = $.grep(aoData, function (item) {
				return item.name === 'length';
			});
			var firstPageItem = $.grep(aoData, function (item) {
				return item.name === 'start';
			});
			var dir = 'asc';
			var sorted = 'id'
			var order = $.grep(aoData, function (item) {
				return item.name === 'order';
			});
			var columns = $.grep(aoData, function (item) {
				return item.name === 'columns';
			});
			var search = $.grep(aoData, function (item) {
				return item.name === 'search';
			});
			var page = 1;
			if (!$.isEmptyObject(firstPageItem) && !$.isEmptyObject(rows)) {
				page = (firstPageItem[0].value / rows[0].value) + 1;
			}

			if (!$.isEmptyObject(order)) {
				dir = order[0].value[0].dir;
				var index = order[0].value[0].column;
				sorted = columns[0].value[index].data;
				aoData.push({'name': 'columns[0][data]', 'value': sorted});
				aoData.push({'name': 'order[0][column]', 'value': 0});
				aoData.push({'name': 'order[0][dir]', 'value': dir});
				delete order[0].value;
				delete columns[0].value;
			}
			if (!$.isEmptyObject(search)) {
				search[0].value.value && aoData.push({'name': 'search[value]', 'value': search[0].value.value});
				delete search[0].value;
			}

			self.addVariableInDataTableJsCall(aoData, 'rows', !$.isEmptyObject(rows) ? rows[0].value : 10);
			self.addVariableInDataTableJsCall(aoData, 'page', page);
			self.addVariableInDataTableJsCall(aoData, 'sidx', sorted);
			self.addVariableInDataTableJsCall(aoData, 'sord', dir);

			// add filters
			if (table && (oSettings.oInit.fnFilterSelector || oSettings.oInit.filterSelector)) {
				var filterSelector = oSettings.oInit.fnFilterSelector || oSettings.oInit.filterSelector;
				if (typeof filterSelector === 'function') {
					filterSelector = filterSelector();
				} else if (typeof filterSelector === 'string') {
					filterSelector = $(filterSelector);
				}
				self.resetFilters(table);
				var masterFilter = {
					rules: [],
					groupOp: 'and'
				};
				self.addCustomFilter(masterFilter, filterSelector, oSettings.oInit.fnFilterMapping || oSettings.oInit.filterMapping);
				masterFilter.rules.length && self.addVariableInDataTableJsCall(aoData, 'filters', JSON.stringify(masterFilter));
			}
			oSettings.jqXHR = $.ajax({dataType: 'json', url: oSettings.ajax, type: 'GET', data: aoData, success: callback});
		}
	};

	$.extend($.fn.dataTable.defaults, {
		// POST data to server
		fnServerData: function (_i, aoData, callback, oSettings) {
			if (oSettings.filters) {
				aoData.push({
					name: 'filters',
					value: JSON.stringify(oSettings.filters)
				});
			}

			var ajax = oSettings.ajax;
			var i;
			if (oSettings.oAjaxData.order && oSettings.oAjaxData.order.length === 1) {
				oSettings.oAjaxData.columns = [
					{
						data: oSettings.oAjaxData.columns[oSettings.oAjaxData.order[0].column].data
					}
				];
				oSettings.oAjaxData.order[0].column = 0;
			} else {
				delete oSettings.oAjaxData.columns;
			}

			if (oSettings.oAjaxData.search && oSettings.oAjaxData.search.value) {
				delete oSettings.oAjaxData.search.regex;
			} else {
				delete oSettings.oAjaxData.search;
			}

			oSettings.jqXHR = $.ajax({
				url: (typeof ajax === 'function') ? ajax(aoData, oSettings) : ajax.url || ajax,
				data: oSettings.oAjaxData,
				success: function (json) {
					var error = json.error || json.sError;
					if (error) {
						_fnLog(oSettings, 0, error);
					}

					oSettings.json = json;
					oSettings.ajax.callback ? oSettings.ajax.callback(json, callback) : callback(json);
				},
				dataType: 'json',
				cache: false,
				type: oSettings.sServerMethod,
				error: function (xhr, error, thrown) {
					if (error === 'parsererror') {
						oSettings.oApi._fnLog(oSettings, 0, 'DataTables warning: JSON data from ' + 'server could not be parsed. This is caused by a JSON formatting error.');
					}
				}
			});
		}
	});
	dataTableFilterManager = self;
	return self;
});
