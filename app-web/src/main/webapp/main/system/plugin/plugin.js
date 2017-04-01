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
							return data.plugin.type === 'feature' ? '<i class="fa fa-wrench"></i>' : current.$main.toIcon(data.node);
						}
					}, {
						data: 'id'
					}, {
						data: 'name'
					}, {
						data: 'vendor',
						className: 'hidden-xs hidden-sm'
					}, {
						data: 'plugin.version'
					}, {
						data: 'plugin.type'
					}, {
						data: 'nodes',
						render: function(nb, _i, plugin) {
							return plugin.plugin.type === 'feature' ? '' : nb;
						}
					}, {
						data: 'subscriptions',
						render: function(nb, _i, plugin) {
							return plugin.plugin.type === 'feature' ? '' : nb;
						}
					}
				]
			});
		}
	};
	return current;
});
