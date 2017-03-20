define(function () {
	var current = {

		initialize: function () {
			_('table').dataTable({
				ajax: REST_PATH + 'plugin',
				dataSrc: '',
				sAjaxDataProp: '',
				dom: '<"row"<"col-xs-6">>t',
				pageLength: -1,
				destroy: true,
				order: [[1, 'asc']],
				columns: [
					{
						data: null,
						orderable: false,
						render: function(data) {
							return current.$main.toIcon(data);
						}
					}, {
						data: 'id'
					}, {
						data: 'name'
					}, {
						data: 'vendor',
						className: 'hidden-xs hidden-sm'
					}, {
						data: 'version'
					}, {
						data: 'tool',
						className: 'hidden-xs',
						render: function(tool) {
							return tool ? '<i class="fa fa-check"></i>' : '';
						}
					}, {
						data: 'nodes'
					}, {
						data: 'subscriptions'
					}
				]
			});
		}
	};
	return current;
});
