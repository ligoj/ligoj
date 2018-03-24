/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(['cascade'], function ($cascade) {
	var current = {

		/**
		 * The current node.
		 */
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
				// Disable service
				item.disabled = (typeof item.data.refined === 'undefined') || item.data.mode === 'none';
				return item;
			}).on('change', function (e) {
				current.model.refined = e.added && e.added.data;
				current.updateModeState();
				current.updateIdVal(e.val);
				current.refreshParameters();
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
				// Mark parameters as unloaded
				current.parameterContext = null;

				// Save the source and notify the load
				current.relatedTarget = event.relatedTarget;
				$(this).trigger('node:show', [current, current.relatedTarget]);
			}).on('submit', current.saveOrUpdate);

			_('node-parameters').on('show.bs.collapse', current.showParameters);
			_('node-delete').on('click', current.deletePopup);
			_('node-mode').find('button').on('click', function (e) {
				e.preventDefault();
				current.refreshParameters();
				$(this).addClass('active').siblings().removeClass('active');
				return false;
			});
		},

		/**
		 * Refresh the parameters panel as needed.
		 */
		refreshParameters: function () {
			var $collapse = _('node-parameters');
			var $container = $collapse.find('.panel-body');
			$container.data('dirty', true);
			if ($collapse.attr('aria-expanded') === "true") {
				current.showParameters();
			}
		},

		showParameters: function () {
			var parent = _('node-tool').val();
			var $container = _('node-parameters').find('.panel-body');
			if (parent) {
				// Check the parameters need to be refreshed
				if ($container.data('dirty')) {
					// A parent node is selected, get the not yet provided parameters
					_('node-parameters').find('.panel-footer.alert-info').removeClass('hidden');
					_('node-parameters').find('.panel-footer.alert-danger').addClass('hidden');
					_('node-create').disable();
					current.configureParameters($container, current.model.id || parent, _('node-mode').find('.active').attr('value'), current.model.id);
				}
			} else {
				// No selected tool, no available parameter
				$container.empty();
				_('node-parameters').find('.panel-footer.alert-info').addClass('hidden');
				_('node-parameters').find('.panel-footer.alert-danger').removeClass('hidden');
			}
		},

		configureParameters: function ($container, node, mode, id) {
			$container.html('<i class="loader fas fa-spin fa-sync-alt fa-5"></i>');
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'node/' + node + '/parameter-value/' + mode.toUpperCase(),
				type: 'GET',
				success: function (parameterValues) {
					// Load parameter configuration context
					$cascade.loadFragment(current, current.$transaction, 'main/home/node-parameter', 'node-parameter', {
						plugins: ['i18n', 'css', 'js'],
						callback: function (context) {
							current.parameterContext = context;
							$container.empty();
							context.configureParameterValues($container, parameterValues, node, mode, id, function () {
								// Configuration and validators are available
								$container.data('dirty', false);
								_('node-create').enable();
							});
						}
					});
				}
			});
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
			_('node-parameters').collapse('hide').find('.panel-body').data('dirty', true);
			current.updateModeState();
			current.updateIdVal(model.refined && model.refined.id, model.id);
		},

		/**
		 * Update the UI state of the mode depending on the inherited subscription mode.
		 */
		updateModeState: function () {
			var availableModes;
			var model = current.model;
			if (model.refined && model.refined.mode !== 'all') {
				availableModes = [model.refined.mode];
			} else {
				availableModes = ['all', 'none', 'create', 'link'];
			}
			var $modes = _('node-mode').find('button').addClass('hidden').removeClass('active');
			for (var index = 0; index < availableModes.length; index++) {
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
			var $container = _('node-parameters').find('.panel-body');
			if (current.parameterContext && !current.parameterContext.validateSubscriptionParameters($container.find('input[data-type]'))) {
				// At least one error, validation manager has already managed the UI errors
				return;
			}
			// Trim parameters to drop not provided parameters


			// Build the data
			var data = {
				id: _('node-id').val(),
				node: _('node-tool').val(),
				name: _('node-name').val(),
				untouchedParameters: current.parameterContext === null,
				parameters: current.parameterContext ? current.parameterContext.getParameterValues($container) : null,
				mode: _('node-mode').find('.active').attr('value')
			};
			$.ajax({
				type: current.model.id ? 'PUT' : 'POST',
				url: REST_PATH + 'node',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages[current.model.id ? 'updated' : 'created'])(data.name));
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
