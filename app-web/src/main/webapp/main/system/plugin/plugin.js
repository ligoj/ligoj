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
							_('search').select2('val','')
							_('popup').modal('show');
						}
					}
				]
			});
			
			_('search').select2({
				placeholder: current.$messages.plugin,
				allowClear: true,
				minimumInputLength: 1,
				multiple:true,
				ajax: {
					url: REST_PATH + 'plugin/search',
					dataType: 'json',
					quietMillis: 250,
   					cache: true,
					data: function (term) {
						return { 'q': term };
					},
					results: function (data) {
						return {
							more: false,
							results: $(data).map(function () {
								return {
									id: this,
									data: this,
									text: this
								};
							})
						};
					}
				}
			});
			
			_('save').click(function(){
				current.install(_('search').select2('val'));
				_('popup').modal('hide');
			});
		},
		
		/**
		 * Install the requested plug-ins.
		 * @param pluginsAsString The plug-in identifiers (comma separated) or null. When null, a prompt is displayed.
		 */
		install : function(plugins) {
			if (plugins) {
				current.installNext(plugins, 0);
			}
		},
		
		/**
		 * Install a the plug-ins from the one at the specified index, and then the next ones.
		 * There is one AJAX call by plug-in, and stops at any error.
		 * @param plugins The plug-in identifiers array to install.
		 * @param index The starting plug-in index within the given array.
		 */
		installNext : function(plugins, index) {
			if (index >= plugins.length) {
				// All plug-ins are installed
				current.table && current.table.api().ajax.reload();
				return;
			}

			// Install this plug-in
			var plugin = plugins[index].trim();
			if (plugin) {
				$.ajax({
					type: 'POST',
					url: REST_PATH + 'plugin/' + encodeURIComponent(plugin),
					dataType: 'text',
					contentType: 'application/json',
					success: function () {
						var next = index < plugins.length - 1;
						notifyManager.notify(Handlebars.compile(current.$messages['downloaded' + (next ? '-continue' : '')])([plugin, (index + 1), plugins.length]));

						// Install the next plug-in
						next & current.installNext(plugins, index + 1);
					}
				});
			} else {
				// The token was empty, install the next real plug-in
				current.installNext(plugins, index + 1);
			}
		}
	};
	return current;
});
