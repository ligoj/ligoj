/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(function () {
	var current = {
		/**
		 * Current selected repository identifier.
		 */
		repository: 'central',

		/**
		 * Datatables of plug-ins.
		 */
		table: null,

		initialize: function () {
			current.table = _('table').on('click', '.update', function () {
				// Update the plug-in
				current.installNext(_('table').dataTable().fnGetData($(this).closest('tr')[0]).plugin.artifact, 0);
			}).dataTable({
				ajax: function () {
					return REST_PATH + 'system/plugin?repository=' + current.repository;
				},
				dataSrc: '',
				sAjaxDataProp: '',
				dom: '<"row"<"col-sm-11"B><"col-sm-1"f>r>t',
				pageLength: -1,
				destroy: true,
				order: [
					[1, 'asc']
				],
				columns: [{
					data: null,
					orderable: false,
					render: function (data) {
						return data.plugin.type === 'feature' ? '<i class="fas fa-wrench"></i>' : current.$main.toIcon(data.node);
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
					className: 'truncate',
					render: function (version, _m, plugin) {
						var result = version;
						if (plugin.newVersion) {
							// Upgrade is available
							result += ' <a class="label label-success update" data-toggle="tooltip" title="' + current.$messages['plugin-update'] + '"><i class="fas fa-arrow-circle-o-up"></i> ' + plugin.newVersion + '</a>';
						}
						return result;
					}
				}, {
					data: 'plugin.type',
					className: 'hidden-xs hidden-sm'
				}, {
					data: 'nodes',
					className: 'icon',
					render: function (nb, _i, plugin) {
						return plugin.plugin.type === 'feature' ? '' : nb;
					}
				}, {
					data: 'subscriptions',
					className: 'icon',
					render: function (nb, _i, plugin) {
						return plugin.plugin.type === 'feature' ? '' : nb;
					}
				}],
				buttons: [{
					extend: 'create',
					text: 'install',
					action: function () {
						_('popup').modal('show');
					}
				}, {
					text: current.$messages.restart,
					className: 'btn-danger',
					action: current.restart
				}, {
					text: current.$messages['check-new-version'],
					action: current.checkNewVersion,
					attr: {
						'title': current.$messages['check-new-version-help'],
						'data-toggle': 'tooltip'
					}
				}, {
					text: current.$messages['upload-plugin'],
					attr: {
						'title': current.$messages['upload-plugin-help'],
						'data-toggle': 'tooltip'
					},
					action: function() {
						_('popup-plugin-upload').modal('show');
					}
				}, {
					extend: 'collection',
					className: 'btn-default plugin-repository-selected',
					text: current.$messages.repository,
					autoClose: true,
					buttons: [{
						className: 'plugin-repository',
						text: 'Maven Central',
						attr: {
							'data-id': 'central'
						},
						action: current.switchRepository
					}, {
						className: 'plugin-repository',
						text: 'OSSRH Nexus',
						attr: {
							'data-id': 'nexus'
						},
						action: current.switchRepository
					}]
				}]
			});
			current.switchRepository('central');

			_('search').select2({
				placeholder: current.$messages.plugin,
				allowClear: true,
				minimumInputLength: 1,
				multiple: true,
				escapeMarkup: function (m) {
					return m;
				},
				ajax: {
					url: function() {
						return REST_PATH + 'system/plugin/search?repository=' + current.repository
					},
					dataType: 'json',
					quietMillis: 250,
					data: function (term) {
						return {
							'q': term
						};
					},
					results: function (data) {
						return {
							more: false,
							results: $(data).map(function () {
								return {
									id: this.artifact,
									data: this,
									text: this.artifact + ' <span class="label label-info">' + this.version + '</span>'
								};
							})
						};
					}
				}
			});

			_('save').click(function () {
				current.install(_('search').select2('val'));
				_('popup').modal('hide');
			});
			_('popup').on('show.bs.modal', function () {
				_('search').select2('data', null);
			}).on('shown.bs.modal', function () {
				_('search').select2('focus');
			});
			_('popup-plugin-upload').on('show.bs.modal', function () {
				$(this).find('.modal-body input').val('');
				_('upload').button('reset');
				validationManager.mapping.DEFAULT = 'plugin-file';
				validationManager.reset($(this));
			}).on('shown.bs.modal', function () {
				_('plugin-file').trigger('focus');
			}).on('submit', function (e) {
				var plugin = _('plugin-id').val();
				$(this).ajaxSubmit({
					url: REST_PATH + 'system/plugin/upload',
					type: 'PUT',
					dataType: 'text',
					beforeSubmit: function () {
						_('upload').button('loading');
					},
					success: function () {
						_('popup-plugin-upload').modal('hide');
						notifyManager.notify(Handlebars.compile(current.$messages['upload-plugin-finished'])(plugin));
					},
					complete: function () {
						_('upload').button('complete');
					}
				});
				e.preventDefault();
				return false;
			});
			
			_('plugin-file').on('change', function() {
				var file = $(this).val();
				var fileNoExt = file.match(/[\\/]([^\\/]+)\.jar/);
				if (fileNoExt) {
					// Guess the artifact/version parts
					var parts = fileNoExt[1].match(/^(plugin-[^\\/]+)-((\d+\.\d+.\d+)(-(SNAPSHOT|RC.*|M.*))?)$/);
					if (parts && parts.length >= 4) {
						_('plugin-id').val(parts[1]);
						_('plugin-version').val(parts[2]);
					} else {
						// Use only the no extension file
						_('plugin-id').val('');
						_('plugin-version').val(fileNoExt);
					}
					validationManager.reset($(this));
					_('upload').enable();
				} else {
					// Not a JAR file, reject it
					validationManager.addError($(this), {rule: 'Pattern', parameters: {regexp:'*.jar'}}, 'Pattern');
					_('upload').disable();
				}
			});
		},

		/**
		 * Switch to another repository
		 */
		switchRepository: function (repository) {
			if (typeof repository !== 'string') {
				repository = $(this[0].node).attr('data-id');
			}
			$('.plugin-repository-selected').html(current.$messages.repository + ': ' + repository + ' <span class="caret"></span>');
			if (current.repository !== repository) {
				// Reload the plug-in list
				current.repository = repository;
				current.clearAndReload();
			}
		},

		/**
		 * Install the requested plug-ins.
		 * @param pluginsAsString The plug-in identifiers (comma separated) or null. When null, a prompt is displayed.
		 */
		install: function (plugins) {
			if (plugins) {
				current.installNext(plugins, 0);
			}
		},

		/**
		 * Install a the plug-ins from the one at the specified index, and then the next ones.
		 * There is one AJAX call by plug-in, and stops at any error.
		 * @param {string[]|string} plugins The plug-in identifiers array to install. Accept a sole plugin string too.
		 * @param {number} index The starting plug-in index within the given array. When undefined, is 0.
		 */
		installNext: function (plugins, index) {
			plugins = $.isArray(plugins) ? plugins : [plugins];
			index = index || 0;
			if (index >= plugins.length) {
				// All plug-ins are installed
				current.clearAndReload();
				return;
			}

			// Install this plug-in
			var plugin = plugins[index].trim();
			if (plugin) {
				$.ajax({
					type: 'POST',
					url: REST_PATH + 'system/plugin/' + encodeURIComponent(plugin) + '?repository=' + current.repository,
					dataType: 'text',
					contentType: 'application/json',
					success: function () {
						var next = index < plugins.length - 1;
						notifyManager.notify(Handlebars.compile(current.$messages['downloaded' + (next ? '-continue' : '')])([plugin, (index + 1), plugins.length]));

						// Install the next plug-in
						if (next) {
							current.installNext(plugins, index + 1);
						}
					}
				});
			} else {
				// The token was empty, install the next real plug-in
				current.installNext(plugins, index + 1);
			}
		},

		/**
		 * Invalid the repository cache.
		 */
		checkNewVersion: function() {
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'system/plugin/cache?repository=' + current.repository,
				dataType: 'text',
				contentType: 'application/json',
				success: function () {
					notifyManager.notify(current.$messages['check-new-version-requested']);
					current.clearAndReload();
				}
			});
		},
		
		/**
		 * Clear the plugin list and reload it.
		 */
		clearAndReload: function() {
			if (current.table) {
				current.table.api().clear().draw().ajax.reload();
			}
		},

		/**
		 * Request a restart of the API container.
		 */
		restart: function () {
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'system/plugin/restart',
				dataType: 'text',
				contentType: 'application/json',
				success: function () {
					notifyManager.notify(current.$messages['restart-requested']);
				}
			});
		}
	};
	return current;
});
