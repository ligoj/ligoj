/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(function () {
	var current = {

		// the main table
		table: null,

		// id to update or to delete
		currentId: null,

		invalidateButton: function () {
			var tr = $(this).parents('tr');
			var uc = current.table.fnGetData(tr[0]);
			$.ajax({
				type: 'POST',
				url: REST_PATH + 'system/cache/' + encodeURIComponent(uc.name),
				dataType: 'json',
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.invalidated)(uc.name));
				}
			});
		},

		// initialize the page
		initialize: function () {
			current.table = $('#table').dataTable({
				ajax: {
					url: REST_PATH + 'system/cache',
					dataSrc: ''
				},
				createdRow: function (nRow) {
					$(nRow).find('.invalidate').on('click', current.invalidateButton);
				},
				columns: [{
					data: 'id'
				}, {
					data: 'name'
				}, {
					data: 'size'
				}, {
					data: 'hitCount'
				}, {
					data: 'missCount'
				}, {
					data: 'bytes',
					render: function (_i, _j, data) {
						return formatManager.formatSize(data.bytes);
					}
				}, {
					data: 'offHeapBytes',
					render: function (_i, _j, data) {
						return formatManager.formatSize(data.offHeapBytes);
					}
				}, {
					data: null,
					width: '16px',
					orderable: false,
					render: function () {
						return '<a class="invalidate"><i class="fas fa-sync-alt" data-toggle="tooltip" title="' + current.$messages.invalidate + '"></i></a>';
					}
				}]
			});
		}
	};
	return current;
});
