/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
/**
 * Prepare generator -> JQuery validator does not manage id selector
 */
define([
	'cascade', 'i18n!validation/nls/validation-messages', 'jquery'
], function ($cascade, validationMessages) {
	var validationManager = {
		/**
		 * Return validation messages.
		 */
		getMessages: function () {
			return validationMessages;
		},

		/**
		 * When true, a notification is displayed.
		 */
		notifyOnError: false,

		/**
		 * Current mapping.
		 */
		mapping: {},

		/**
		 * Expose validation function.
		 */
		validate: function (errors, selector, ui) {
			var $that = validationManager;
			var $form = selector || $that.closestForm($that.mapping) || _('_ucDiv');
			var hasError = false;
			var key;
			$that.reset($form);
			var messages = '';
			for (key in errors) {
				if ({}.hasOwnProperty.call(errors, key)) {
					hasError = true;
					var error = errors[key];
					// Only root error properties
					if (key.indexOf('.') === -1) {
						// Root property
						messages += $that.addPropertyMessage(messages, key, selector, $form, error, ui);
						for (subKey in errors) {
							if ({}.hasOwnProperty.call(errors, subKey)) {
								if (subKey.startsWith(key + '.')) {
									// Nested property
									var subError = errors[subKey];
									var nested = subKey.substring(subKey.indexOf('.') + 1);
									messages += $that.addPropertyMessage(messages, key, selector, $form, subError, ui, nested);
								}
							}
						}
					}
				}
			}

			if (ui && hasError && $that.notifyOnError) {
				$that.showGlobalError(undefined, [validationMessages.Global]);
			}
			return messages;
		},
		
		addPropertyMessage: function(messages, key, selector, $form, error, ui, nested) {
			var $that = validationManager;
			if (ui) {
				if (key.indexOf('[') === -1 || $that.mapping[key]) {
					// Manage form case
					$that._validateForm(key, selector, $form, error, nested);
				} else {
					// Manage grid case
					$that._validateGrid(key, selector, $form, error, nested);
				}
			} else {
				messages = (messages ? ',' : '') + $that.deserialize(error);
			}
			return messages;
		},
		
		/**
		 * Guess the closest form from the mapping and looking for unique selector based on identifier.
		 * @param {Object} The mappings : key to selector.
		 * @return {jQuery} A non empty jQuery object when a form containing at least one target unique element has been found.
		 */
		closestForm: function(mapping) {
			for (var key in mapping) {
				if ({}.hasOwnProperty.call(mapping, key) && mapping[key].indexOf('#') !== -1) {
					var $form =  $(mapping[key]).closest('form');
					if ($form.length && validationManager.isVisible($form)) {
						// This form seems to be a good candidate
						return $form;
					}
				}
			}
		},

		_isQualifiedSelector: function (target) {
			return target.indexOf('#') !== -1 || target.indexOf('.') !== -1 || target.indexOf(' ') !== -1;
		},

		/**
		 * Validate a standard form.
		 */
		_validateGrid: function (key, selector, $form, error, nested) {
			var $that = validationManager;
			// Lookup 'table[row-index].field' or 'table[].field'
			var directField = $that._getMapping(key, false) || $that._getMapping(key.replace(/\[[0-9]+\]/, '[]'), false);
			var splitKey = key.split(/\[|\]\./g);
			var index = splitKey[1];

			// Lookup 'table[row-index]' or 'table[]'
			var fields = (directField || $that._getMapping(splitKey[0] + '[' + index + ']', false) || $that._getMapping(splitKey[0] + '[]', false) || splitKey[0]).split(';');
			var tableName = fields[0];
			var inputName = $that._getMapping(splitKey[2], true);
			var $field;
			var $table;
			if ($that._isQualifiedSelector(tableName)) {
				// Selector mode, inject table name (%0), index(%1) and input name(%2)
				$field = $form.find(tableName.replace(/%0/g, tableName).replace(/%1/g, index).replace(/%2/g, inputName));
				if ($field.length !== 0 && $field.find('[name="' + inputName + '"]').length) {
					// More specific field found, use it
					$field = $field.find('[name="' + inputName + '"]');
				}
			} else {
				// Static mode
				$table = $form.find('#' + tableName + ',table[name="' + tableName + '"]');
				if ($.fn.DataTable.fnIsDataTable($table.get(0)) && $table.get(0).dataTable().fnGetNodes(index)) {
					// 'DataTables' case
					$field = $($table.get(0).dataTable().fnGetNodes(index)).find('[name="' + inputName + '"]');
				} else {
					// Simple table case
					$field = $table.find($(':eq(' + index + ')'));
				}
			}

			if ($that.isVisible($field)) {
				// Specific error on a visible field or in a non active tab
				$that.addError($field, error, splitKey[2], false, nested);
			} else {
				// No element found -> global error
				$that.showGlobalError($form, error, selector, nested);
			}
		},

		/**
		 * Manage specific error for multiple fields
		 */
		_validateFields: function (key, selector, $form, error, fieldNames, nested) {
			var $that = validationManager;
			for (var i = 0; i < fieldNames.length; i++) {
				// The field name
				var fieldName = fieldNames[i];

				// Lookup the field using either a $.find by name/id or by a selector
				var $field = $form.find($that._isQualifiedSelector(fieldName) ? fieldName : ('[name="' + fieldName + '"],[id="' + fieldName + '"]'));
				if ($that.isVisible($field)) {
					// Specific error on a visible field or in a non active tab
					$that.addError($field, error, key, false, nested);
				} else {
					// No element found -> global error
					$that.showGlobalError(fieldName, error, selector, nested);
				}
			}
		},

		/**
		 * Check the given field is visible.
		 */
		isVisible: function ($field) {
			return ($field.is(':visible') || $field.closest('[data-toggle="tab"]').closest('li').not('.active')) && $field.closest('.modal:not(.in)').length === 0;
		},

		/**
		 * Validate a standard form.
		 */
		_validateForm: function (key, selector, $form, error, nested) {
			// Key the mapped HTMl element or DEFAULT one if defined
			var $that = validationManager;
			var mappedKey = $that.mapping[key] || $that.mapping.DEFAULT || key;
			var fields = mappedKey.split(',');
			if (fields.length == 0) {
				fields = mappedKey.split(';');
			}

			// Mapped specific error for multiple fields
			$that._validateFields(key, selector, $form, error, fields, nested);
		},

		reset: function ($selector) {
			$selector = $selector || $('#_ucDiv');
			var $groups = $selector;
			if (!$selector.is('.form-group.has-error') && !$selector.is('.form-group.has-warning')) {
				$groups = $selector.find('.form-group.has-error,.form-group.has-warning');
			}
			if ($groups.length === 0) {
				$groups = $selector.closest('.form-group');
			}
			validationManager.cleanClass($groups).each(validationManager.resetGroup);
			$groups.find('.form-control-feedback').remove();

			// Also remove tab error
			$selector.find('.nav-tabs.error').removeClass('error').find('a.error').removeClass('error');
			$selector.find('.nav-tabs.warning').removeClass('warning').find('a.warning').removeClass('warning');

			// Remove global form errors
			$selector.find('.alert.alert-danger.error').remove();
			$selector.find('.alert.alert-warning.warning').remove();
			return $selector;
		},

		resetGroup: function () {
			var title = $(this).attr('data-normal-title');
			if (title) {
				$(this).attr('title', title).removeAttr('data-normal-title').removeAttr('data-error-property');
			} else {
				$(this).removeAttr('title').removeAttr('data-error-property');
			}
		},

		_initialize: function () {
			// Initialize the document management.
			var $that = this;

			// Track the use case loading
			$cascade.register('hash', function () {
				$that.mapping = {};
			});
			return $that;
		},

		deserialize: function (errors) {
			if (Object.prototype.toString.call(errors) !== '[object Array]') {
				errors = [errors];
			}
			var messages = '';
			var errorIndex;
			for (errorIndex = 0; errorIndex < errors.length; errorIndex++) {
				var error = errors[errorIndex];
				var message = $cascade.$messages.error[error.rule || error] || $cascade.$messages[error.rule || error] || validationMessages[error.rule || error] || error.rule || error;
				if (message.indexOf('{{') !== -1 && error.parameters) {
					message = Handlebars.compile(message)(error.parameters.value || error.parameters);
				}
				if (messages) {
					messages += ', ' + message;
				} else {
					messages = message;
				}
			}
			return messages;
		},

		_getMapping: function (key, useKey) {
			var mapping = validationManager.mapping[key];
			if (mapping || !useKey) {
				return mapping;
			}
			return key;
		},

		/**
		 * @param {String} nested : When defined, name of the prefix corresponding to the nested property.
		 */
		showGlobalError: function (key, errors, $form, nested) {
			$form = ($form && $form.is(':visible')) ? $form : _('_ucDiv').find('form.modal.in:visible');
			$form = $form.length > 0 ? $form : _('_ucDiv');
			var message = (nested ? nested + ': ' : '') + validationManager.deserialize(errors);
			var $alert;
			if ($form.length > 0) {
				// We can display a nice alert in the given form
				$alert = $form.find('.alert.alert-danger.error');
				if ($alert.length === 0) {
					// Create a new alert container
					$alert = validationManager.newAlert(message);
					var legend = $form.find('legend');
					if (legend.length === 0) {
						$form.prepend($alert);
					} else {
						legend.after($alert);
					}
				} else {
					$alert.append('<br>').append(message);
				}
			} else {
				notifyManager && notifyManager.notify(message, errorManager.getMessages().error400, 'warning', 'toast-top-right');
			}
		},

		/**
		 * Return a new alert container.
		 */
		newAlert: function (message) {
			return $('<div class="alert alert-danger error"><button type="button" class="close" data-dismiss="alert">&times;</button>' + message + '</div>');
		},

		/**
		 * Create a validation error.
		 * @param {Object} field : A jQuery object to decorate.
		 * @param {Object} errors : Rules either as array, simple rule, or text.
		 * @param {Object} key : The related business property.
		 * @param {Boolean} feedback : When true, a feedback will be added.
		 * @param {String} nested : When defined, name of the prefix corresponding to the nested property.
		 */
		addError: function (field, errors, key, feedback, nested) {
			validationManager.addMessage(field, 'has-error', errors, key, feedback && 'fas fa-times', nested);
		},

		/**
		 * Create a validation warning.
		 * @param {Object} field : A jQuery object to decorate.
		 * @param {Object} errors : Rules either as array, simple rule, or text.
		 * @param {Object} key : The related business property.
		 * @param {Boolean} feedback : When true, a feedback will be added.
		 */
		addWarn: function (field, errors, key, feedback) {
			validationManager.addMessage(field, 'has-warning', errors, key, feedback && 'fas fa-warning');
		},

		/**
		 * Create a validation warning.
		 * @param {Object} field : A jQuery object to decorate.
		 * @param {Object} errors : Rules either as array, simple rule, or text.
		 * @param {Object} key : The related business property.
		 * @param {Boolean} feedback : When true, a feedback will be added.
		 */
		addSuccess: function (field, errors, key, feedback) {
			validationManager.addMessage(field, 'has-success', errors, key, feedback && 'fas fa-check');
		},

		cleanClass: function ($group) {
			$group.removeClass('has-success').removeClass('has-warning').removeClass('has-error').removeClass('has-feedback').find('.form-control-feedback').remove();
			return $group;
		},

		/**
		 * Create a validation error.
		 * @param {Object} field : A jQuery object to decorate.
		 * @param {Object[]} containerClass : Array of classes to be added on the container of the field.
		 * @param {Object} errors : Rules either as array, simple rule, or text.
		 * @param {Object} key : The related business property.
		 * @param {Object} feedbackClass : Optional feedback class.
		 * @param {String} nested : When defined, name of the prefix corresponding to the nested property.
		 */
		addMessage: function ($field, containerClass, errors, key, feedbackClass, nested) {
			$field.closest('.form-group').length || $field.closest('td').addClass('form-group');

			// Replace the 'title' attribute, and add the 'data-error-property' corresponding to the JSON property
			// error
			var $group = $field.closest('.form-group');
			var error = (nested ? nested + ': ' : '') + validationManager.deserialize(errors);
			if (error) {
				if ($group.attr('data-error-property')) {
					$group.attr('title', $group.attr('title') + ', ' + error);
					$group.attr('data-error-property', $group.attr('data-error-property') + ',' + key);
				} else {
					$group.attr('data-error-property', key).attr('data-normal-title', $group.attr('title')).attr('title', error);
				}
				$group.attr('data-toggle', 'tooltip');
			}

			validationManager.cleanClass($group);
			feedbackClass && $group.addClass('has-feedback').find('.form-control:visible').first().after('<span class="form-control-feedback" aria-hidden="true"><i class="' + feedbackClass + '"></i></span>');
			containerClass && $group.addClass(containerClass);

			// Handle tab parent
			containerClass && $field.parents('.tab-pane').each(function () {
				var tabId = $(this).attr('id');
				var tabLink = $(this).closest('.tab-content').parent().find('.nav-tabs').addClass(containerClass).find('a[href="#' + tabId + '"]');
				if (tabLink.parent().parent().parent().is('.dropdown')) {
					// Drop down menu
					tabLink = tabLink.parent().parent().parent().find('a.dropdown-toggle');
				}
				tabLink.addClass(containerClass);
			});
		}
	};
	validationManager._initialize();
	window.validationManager = validationManager;
	return validationManager;
});
