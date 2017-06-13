define(['cascade'], function ($cascade) {
	var current = {

		model : '',
		
		/**
		 * The source node of this popup. Copied from Bootstrap modal event.
		 */
		relatedTarget : null,

		initialize: function () {
			current.$main.newSelect2Node('#node-tool', '?depth=1', null, null, null, true, function(item) {
				if (!item.id.match('^[a-z]+(:[a-z0-9]+){2}$')) {
					// Disable service
					item.disabled = true;
				}
				return item;
			}).on('change', function(e) {
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
				debugger;
				
				// Reset the UI
				current.setModel(null);
				$popup.trigger('node:show', [current, current.relatedTarget]);
			}).on('submit', current.saveOrUpdate);

			_('node-mode').find('button').on('click', function () {
				$(this).addClass('active').siblings().removeClass('active');
			});
		},
		
		/**
		 * Update the model and the popup content.
		 * @param {Object} model The optional model to set. May be null.
		 */
		setModel: function(model) {
			model = model || {};
			current.model = model;
			_('node-tool').select2('data', model.refined || null);
			_('node-id').val(model.id || '');
			_('node-name').val(model.name || '');
			_('node-mode').find('button').removeClass('active').filter('[value="' + (model.mode || 'link') + '"]').addClass('active');
			current.updateIdState(model.refined && model.refined.id, model.id);
		},
		
		/**
		 * Update the UI state of the 'id' field from the selected tool.
		 * @param {string} tool The tool identifier.
		 * @param {string} id The optional node identifier.
		 */
		updateIdState: function(tool, id) {
			if (tool) {
				_('node-id').val(id || (tool + ':')).removeClass('disabled').removeAttr('disabled');
			} else {
				_('node-id').val('').addClass('disabled').attr('disabled', 'disabled');			
			}
		},
		
		saveOrUpdate: function() {
			// Custom mapping
			validationManager.mapping['id'] = '#node-id';
			validationManager.mapping['refined'] = '#node-tool';
			validationManager.mapping['name'] = '#node-name';
			validationManager.mapping['mode'] = '#node-mode';
			var refined = _('node-tool').select2('data');
			
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
		}
	};
	return current;
});
