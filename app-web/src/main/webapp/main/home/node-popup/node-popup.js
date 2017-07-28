define(['cascade'], function ($cascade) {
	var current = {

		model: '',

		/**
		 * Cascade context of parameter management.
		 */
		parameterContext: null,

		/**
		 * The source node of this popup. Copied from Bootstrap modal event.
		 */
		relatedTarget: null,

		initialize: function () {
			current.$main.newSelect2Node('#node-tool', '?depth=1', null, null, null, true, function (item) {
				if (!item.id.match('^[a-z]+(:[a-z0-9]+){2}$')) {
					// Disable service
					item.disabled = true;
				}
				return item;
			}).on('change', function (e) {
				current.updateIdVal(e.val);
			});

			// Popup/ Component event management
			_('node-popup').on('shown.bs.modal', function () {
				// Efficient pre-focus depending on the UI data
				if (_('node-name').val()) {
					_('node-name').focus();
				} else if (_('node-tool').val()) {
					_('node-id').focus();
				} else {
					_('node-tool').focus();
				}
			}).on('show.bs.modal', function (event) {
				current.relatedTarget = event.relatedTarget;
				current.parameterContext = null;
				$(this).trigger('node:show', [current, current.relatedTarget]);
			}).on('submit', current.saveOrUpdate);

			_('node-parameters').on('show.bs.collapse', current.configureParameters);
			_('node-delete').on('click', current.deletePopup);
			_('node-mode').find('button').on('click', function (e) {
				$(this).addClass('active').siblings().removeClass('active');
				e.preventDefault();
				return false;
			});
		},

		configureParameters: function () {
			// Load parameter configuration context
			var parent = _('node-tool').val();
			var $container = $(this).find('.panel-body').html('<i class="loader fa fa-spin fa-refresh fa-5"></i>');
			if (parent) {
				// A prent node is selected, get the not yet provided parameters
				$container.html('<i class="loader fa fa-spin fa-refresh fa-5"></i>');
				_('node-create').disable();
				var mode = _('node-mode').find('.active').attr('value');
				$.ajax({
					dataType: 'json',
					url: REST_PATH + 'node/' + parent + '/parameter/' + mode.toUpperCase(),
					type: 'GET',
					success: function (data) {
						$cascade.loadFragment(current, current.$transaction, 'main/home/node-parameter', 'node-parameter', {
							plugins: ['i18n', 'js'],
							callback: function (context) {
								current.parameterContext = context;
								$container.empty();
								debugger;
								context.configureParameters($container, data, parent, mode, function () {
									// Configuration and validators are available
									_('node-create').enable();
								});
							}
						});
					}
				});
			} else {
				// No selected tool, no available parameter
				$container.html('Select a tool');
			}
		},

		/**
		 * Update the model and the popup content.
		 * @param {Object} model The optional model to set. May be null.
		 */
		setModel: function (model) {
			model = model || {};
			current.model = model;
			_('node-tool').disable(model.id).select2('data', model.refined || null);
			_('node-id').disable(model.id);
			_('node-name').val(model.name || '');
			_('node-delete')[model.id ? 'removeClass' : 'addClass']('hidden');
			current.updateModeState(model);
			current.updateIdVal(model.refined && model.refined.id, model.id);
		},

		/**
		 * Update the UI state of the mode depending on the inherited subscription mode.
		 */
		updateModeState: function (model) {
			var availableModes;
			if (model.refined && model.refined.mode !== 'all') {
				availableModes = [model.refined.mode];
			} else {
				availableModes = ['all', 'none', 'create', 'link'];
			}
			var $modes = _('node-mode').find('button').addClass('hidden').removeClass('active');
			for (const index in availableModes) {
				$modes.filter('[value="' + availableModes[index] + '"]').removeClass('hidden');
			}
			$modes.filter('[value="' + (model.mode || availableModes[0]) + '"]').addClass('active');
		},

		/**
		 * Update the UI state of the 'id' field from the selected tool.
		 * @param {string} parent The parent node identifier.
		 * @param {string} id The optional current node identifier.
		 */
		updateIdVal: function (parent, id) {
			if (parent) {
				_('node-id').val(id || (parent + ':'));
			} else {
				_('node-id').val(id || 'feature:');
			}
		},

		saveOrUpdate: function () {
			// Custom mapping
			validationManager.mapping['id'] = '#node-id';
			validationManager.mapping['refined'] = '#node-tool';
			validationManager.mapping['name'] = '#node-name';
			validationManager.mapping['mode'] = '#node-mode';

			// Build the data
			var data = {
				id: _('node-id').val(),
				refined: _('node-tool').val(),
				name: _('node-name').val(),
				mode: _('node-mode').find('.active').attr('value')
			};
			$.ajax({
				type: current.model.id ? 'PUT' : 'POST',
				url: REST_PATH + 'node',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages[current.currentId ? 'updated' : 'created'])(data.name));
					_('node-popup').modal('hide').trigger('node:saved', [current, current.relatedTarget, data, current.model]);
				}
			});
		},

		deletePopup: function () {
			bootbox.confirmDelete(function (confirmed) {
				confirmed && current.delete();
			}, current.model.name + ' (' + current.model.id + ')');
		},

		/**
		 * Delete the current node
		 */
		delete: function () {
			var model = current.model;
			$.ajax({
				type: 'DELETE',
				url: REST_PATH + 'node/' + model.id,
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.deleted)(model.name));
					_('node-popup').modal('hide').trigger('node:saved', [current, current.relatedTarget, model, model]);
				}
			});
		}
	};
	return current;
});
