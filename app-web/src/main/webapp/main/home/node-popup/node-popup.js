define(['cascade'], function ($cascade) {
	var current = {

		model: '',

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
				current.updateIdState(e.val);
			});

			// Popup/ Component event management
			var $popup = _('node-popup');
			$popup.on('shown.bs.modal', function () {
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

				// Reset the UI
				current.setModel(null);
				$popup.trigger('node:show', [current, current.relatedTarget]);
			}).on('submit', current.saveOrUpdate);

			_('node-delete').on('click', current.deletePopup);
			_('node-mode').find('button').on('click', function (e) {
				$(this).addClass('active').siblings().removeClass('active');
				e.preventDefault();
				return false;
			});
		},

		/**
		 * Update the model and the popup content.
		 * @param {Object} model The optional model to set. May be null.
		 */
		setModel: function (model) {
			model = model || {};
			current.model = model;
			_('node-tool').select2('data', model.refined || null);
			_('node-id').val(model.id || '');
			_('node-name').val(model.name || '');
			current.updateModeState(model);
			current.updateIdState(model.refined && model.refined.id, model.id);
			_('node-delete')[model.id ? 'removeClass' : 'addClass']('hidden');
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
			for (var i = 0; i < availableModes.length; i++) {
				$modes.filter('[value="' + availableModes[i] + '"]').removeClass('hidden');
			}
			$modes.filter('[value="' + (model.mode || availableModes[0]) + '"]').addClass('active');
		},

		/**
		 * Update the UI state of the 'id' field from the selected tool.
		 * @param {string} tool The tool identifier.
		 * @param {string} id The optional node identifier.
		 */
		updateIdState: function (tool, id) {
			if (tool) {
				_('node-id').val(id || (tool + ':')).removeClass('disabled').removeAttr('disabled');
			} else {
				_('node-id').val('').addClass('disabled').attr('disabled', 'disabled');
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
				mode: _('node-mode').find('.active').attr('value') || null
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
