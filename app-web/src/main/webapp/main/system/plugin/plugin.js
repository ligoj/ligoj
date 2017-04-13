define(function () {
	var current = {

		initialize: function () {
			_('table').dataTable({
				ajax: REST_PATH + 'plugin',
				dataSrc: '',
				sAjaxDataProp: '',
				dom: '<"row"<"col-sm-6"B><"col-sm-6"f>r>t',
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
						data: 'plugin.version',
						className: 'truncate'
					}, {
						data: 'plugin.type',
						className: 'hidden-xs hidden-sm'
					}, {
						data: 'nodes',
						className: 'icon',
						render: function(nb, _i, plugin) {
							return plugin.plugin.type === 'feature' ? '' : nb;
						}
					}, {
						data: 'subscriptions',
						className: 'icon',
						render: function(nb, _i, plugin) {
							return plugin.plugin.type === 'feature' ? '' : nb;
						}
					}
				],
				buttons: [
					{
						extend: 'create',
						text: 'install',
						action: function () {
							bootbox.prompt(current.$messages.name, current.install);
						}
					}
				]
			});
		},
		
		install : function(name) {
			name && $.ajax({
				type: 'POST',
				url: REST_PATH + 'plugin/' + encodeURIComponent(name),
				dataType: 'text',
				contentType: 'application/json',
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.downloaded)(name));
					current.table && current.table.api().ajax.reload();
				}
			});
		}
	};
	return current;
});
