define(["jquery", "cascade", "datatables.net-buttons", "datatables.net-buttons-bs"], function($, $cascade, Buttons) {

	$.fn.dataTableExt.afnSortData['dom-text'] = function(oSettings, iColumn) {
		var aData = [];
		$('td:eq(' + oSettings.oApi._fnColumnIndexToVisible(oSettings, iColumn) + ') input', oSettings.oApi._fnGetTrNodes(oSettings)).each(function() {
			aData.push(this.value);
		});
		return aData;
	};

	$.fn.dataTableExt.afnSortData['dom-select'] = function(oSettings, iColumn) {
		var aData = [];
		$('td:eq(' + oSettings.oApi._fnColumnIndexToVisible(oSettings, iColumn) + ') select', oSettings.oApi._fnGetTrNodes(oSettings)).each(function() {
			aData.push($(this).val());
		});
		return aData;
	};

	$.extend( Buttons.prototype, {

		/**
		 * Destroy the instance, cleaning up event handlers and removing DOM
		 * elements
		 * @return {Buttons} Self for chaining
		 */
		destroy: function ()
		{
			// Key event listener
			$('body').off( 'keyup.'+this.s.namespace );

			// Individual button destroy (so they can remove their own events if
			// needed
			var buttons = this.s.buttons;
			var i, ien;

			for ( i=buttons.length ; i-->0 ; ) {
				this.remove( buttons[i].node );
			}

			// Container
			this.dom.container.remove();

			// Remove from the settings object collection
			var buttonInsts = this.s.dt.settings()[0];

			for ( i=0, ien=buttonInsts.length ; i<ien ; i++ ) { // FIX FDA, remove loop issue
				if ( buttonInsts.inst === this ) {
					buttonInsts.splice( i, 1 );
					break;
				}
			}

			return this;
		}
	});

	/**
	 * Put all data of the table in a javascript object
	 * @param {Object} dataTable Table containing the row to export
	 */
	$.fn.dataTableExt.table2object = function(dataTable) {
		var result = new Array();

		var lines = dataTable.fnGetNodes();
		for (var idx = 0; idx < lines.length; idx++) {
			var row = new Object();

			// Iterate on each input and select
			$('input,select', lines[idx]).each(function() {
				if (this.name) {
					// Automatically format date
					if ($(this).is('.date')) {
						row[this.name] = this.value && this.value.length > 0 ? moment(this.value, formatManager.messages.shortdateMomentJs).valueOf() : null;
					} else {
						row[this.name] = this.value;
					}
				}
			});

			// Special case : "id" hidden field
			row['id'] = dataTable.fnGetData(idx).id;
			result.push(row);
		}

		return result;
	};

	/**
	 * Put all data of the table in a json string
	 * TODO ALO : remove this method and use JSON.stringify(table2object) instead ?
	 * @param {Object} dataTable Table containing the row to export
	 */
	$.fn.dataTableExt.table2json = function(dataTable) {
		var lines = dataTable.fnGetNodes();
		var result = "[";
		var firstLine = true;
		for (var idx = 0; idx < lines.length; idx++) {
			var line = lines[idx];
			var firstCell = true;
			if (firstLine) {
				firstLine = false;
			} else {
				result += ',';
			}
			result += '{';
			$('input,select', line).each(function() {
				if (firstCell) {
					firstCell = false;
				} else {
					result += ',';
				}
				result += '"' + this.name + '" : "' + this.value + '"';
			});
			result += '}';
		}
		result += "]";
		return result;
	};

	var DataTable = $.fn.dataTable;
	DataTable.ext.buttons.create = {
		text : $cascade.$messages["new"],
		className : "btn-success btn-raised"
	};
	DataTable.ext.buttons.popup = {
		text : $cascade.$messages["new"],
		className : "btn-raised",
		target : "#popup",
		tag : "button",
		init : function(_i, $button, oConfig) {
			$button.attr("data-target", oConfig.target).attr("data-toggle", "modal");
		}
	};

	DataTable.ext.buttons.edit = {
		text : $cascade.$messages["update"],
		className : ""
	};

	DataTable.ext.buttons.delete = {
		text : $cascade.$messages["delete"],
		tag : "button",
		className : "btn-danger btn-raised"
	};

	DataTable.ext.buttons.save = {
		text : $cascade.$messages["save"],
		tag : "button",
		className : "btn-primary btn-raised"
	};

	DataTable.ext.buttons.link = {
		text : $cascade.$messages["new"],
		className : "btn-link",
		href : "#/",
		tag : "a",
		attr : "",
		init : function(_i, $button, oConfig) {
			$button.attr("href", oConfig.href).off('click.dtb').off('keyup.dtb');
			if (oConfig.attr) {
				$button.attr(oConfig.attr, oConfig.attr);
			};
		}
	};

	DataTable.ext.buttons.cancel = {
		text : $cascade.$messages["cancel"],
		className : "btn-link"
	};
});
