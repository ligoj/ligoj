define(['cascade'], function ($cascade) {
	var current = {

		/**
		 * Tool parameters configuration for current subscription creation
		 * @type {object}
		 */
		configuration: null,
		initialize: function () {
			// Reset the secured input on demand
			$(document).off('click.secured-parameter').on('click.secured-parameter', '.form-group.secured.untouched .secured-mode .fa-lock', function (e) {
				$(e.target).closest('.form-group.secured').addClass('touched').removeClass('untouched').find('.parameter').enable().val('');
			});
		},

		/**
		 * Return the parameter values inside the given container and configure the validation mapping.
		 */
		getParameterValues: function ($container) {
			var values = [];
			var i = 0;
			$container.find('.parameter[data-type]').each(function () {
				var $input = $(this);
				var $group = $input.closest('.form-group');
				var id = $input.attr('id');
				var parameter = current.configuration.parameters[id];
				var type = parameter.type;
				validationManager.mapping['parameters[' + i + '].parameter'] = id;
				validationManager.mapping[id] = id;
				if (parameter.secured && $group.is('.untouched')) {
					// Secured untouched parameter
					values.push({
						parameter: id,
						untouched: true
					});
				} else {
					var value = {
						parameter: id,
						selections: type === 'multiple' ? $input.select2('val') : null,
						tags: type === 'tags' ? $input.select2('val') : null,
						index: (type === 'select' && $input.val()) || null,
						bool: type === 'bool' ? $input.is(':checked') : null,
						integer: (type === 'integer' && $input.val() !== '') ? parseInt($input.val(), 10) : null,
						text: (type === 'text' && $input.val() !== '') ? $input.val() : null,
						date: (type === 'date' && $input.val() !== '') ? moment($input.val(), formatManager.messages.shortdateMomentJs).valueOf() : null
					};
					Object.keys(value).forEach((key) => (value[key] === null || value[key] === '') && delete value[key]);
					if (Object.keys(value).length === 2) {
						values.push(value);
					}
				}
				i++;
			});
			// Trim the data
			return values;
		},

		/**
		 * Hold the parameter generation configuration : UI input, validator, UI component
		 */
		newSubscriptionParameterConfiguration: function (node, mode) {
			var configuration = {
				node: node,
				mode: mode,
				validators: {
					integer: function ($element) {
						var intRegex = /^\d*$/;
						if (intRegex.test($element.val())) {
							validationManager.reset($element.closest('.form-group'));
							return true;
						}
						validationManager.addError($element, {
							rule: 'Integer'
						}, $element.attr('id'));
						return false;
					}
				},
				values: {
					select: function (value, $element) {
						$element.select2('val', value.text); // Not fully implemented
					},
					multiple: function (value, $element) {
						var selections = [];
						for (var index = 0; index < value.selections.length; index++) {
							selections.push(value.parameter.values[value.selections[index]]);
						}
						$element.select2('val', selections);
					},
					bool: function (value, $element) {
						$element.prop('checked', value.bool);
					},
					tags: function (value, $element) {
						$element.select2('tags', tags);
					},
					text: function (value, $element) {
						$element.val(value.text);
					},
					integer: function (value, $element) {
						$element.val(value.integer);
					}
				},
				renderers: {
					select: function (parameter, $input) {
						$input.select2({
							data: parameter.values
						});
					},
					multiple: function (parameter, $input) {
						$input.select2({
							multiple: true,
							data: parameter.values
						});
					},
					bool: function (parameter, $input) {
						$input.attr('type', 'checkbox');
					},
					tags: function (parameter, $input) {
						$input.select2({
							multiple: true,
							tags: parameter.values
						});
					},
					integer: function (parameter, $input) {
						$input.on('change', function () {
							configuration.validators.integer($input);
						});
					},
					secured: function (parameter, $input) {
						// Add a tiny unlocker
						$input.after('<span class="secured-mode"><i class="fa fa-lock text-warning" title="' + current.$messages['secured-untouched'] + '" data-toggle="tooltip"></i><i class="fa fa-unlock-alt text-info" title="' + current.$messages['secured-touched'] + '" data-toggle="tooltip"></i><i title="' + current.$messages['secured-empty'] + '" data-toggle="tooltip" class="fa fa-unlock"></i></span>');
					}
				},
				providers: {
					'input': {
						standard: function (parameter) {
							// Create a basic input, manages type, id, required
							return $('<input class="form-control parameter" type="' + (/(password|secret)/.test(parameter.id) ? 'password' : 'text') + '" autocomplete="off" data-type="' + parameter.type + '" id="' + parameter.id + '"' + (parameter.mandatory ? ' required' : '') + '>');
						},
						date: function (parameter) {
							// Create a data input
							var $input = configuration.providers.input.standard(parameter).addClass('date');
							var $wrapper = $('<div class="input-group"><span class="add-on"><i class="fa fa-calendar"></i></span></div>');
							$wrapper.find('.input-group').prepend($input);
							return $wrapper;
						}
					},
					'form-group': {
						standard: function (parameter, $container, $input) {
							// Create a "form-group" with empty "controls", manages name, id, description, required
							var required = parameter.mandatory ? ' required' : '';
							var secured = parameter.secured ? ' secured' : '';
							var id = parameter.id;
							var validator = configuration.validators[id];
							var name = current.$messages[id] || parameter.name || '';
							var description = current.$messages[id + '-description'] || parameter.description;
							description = description ? ('<span class="help-block">' + description + '</span>') : '';
							var $dom = $('<div class="form-group' + required + secured + '"><label class="control-label col-md-4" for="' + id + '">' + name + '</label><div class="col-md-8">' + description + '</div></div>');
							$dom.children('div').prepend($input);
							$container.append($dom);
							validator && $input.on('change', validator).on('keyup', validator);
							return $dom;
						}
					}
				}
			};
			return configuration;
		},

		/**
		 * Replace the default text rendering by a Select2 for a service providing a suggest for the search.
		 */
		registerXServiceSelect2: function (configuration, id, restUrl, customQuery, allowNew, changeHandler, lowercase) {
			var cProviders = configuration.providers['form-group'];
			var previousProvider = cProviders[id] || cProviders.standard;
			cProviders[id] = function (parameter, container, $input) {
				// Render the normal input
				var $fieldset = previousProvider(parameter, container, $input);
				$input = $fieldset.find('input');

				// Create the select2 suggestion a LIKE %criteria% for project name, display name and description
				current.newNodeSelect2($input, restUrl, current.$super('toName'), function (e) {
					_(id + '_alert').parent().remove();
					if (e.added && e.added.id) {
						$input.next().after('<div><br><div id="' + id + '_alert" class="well">' + current.$messages.id + ': ' + e.added.id + (e.added.name ? '<br>' + current.$messages.name + ': ' + e.added.name : '') + (e.added.key || e.added.pkey ? '<br>' + current.$messages.pkey + ': ' + (e.added.key || e.added.pkey) : '') + (e.added.description ? '<br>' + current.$messages.description + ': ' + e.added.description : '') + (e.added['new'] ? '<br><i class="fa fa-warning"></i> ' + current.$messages['new'] : '') + '</div></div>');
					}
					changeHandler && changeHandler();
				}, parameter, customQuery, allowNew, lowercase);
			};
		},

		/**
		 * Build node/subscription parameter values: UI and configuration.
		 * Note this is an ansynchronous function thats requires the related node's context to render the parameter.
		 * @param {jQuery} $container Target container where the parameters will be redered..
		 * @param {Array} values Parameter values with parameter definition.
		 * @param {string} node Node identifier to use for the target subscription.
		 * @param {string} mode Mode context : link, create, none,...
		 * @param {function} callback Optional callback(configuration) called when UI is rendered.
		 */
		configureParameterValues: function ($container, values, node, mode, callback) {

			// Drop required flag for nodes
			var parameters = [];
			for (var index = 0; index < values.length; index++) {
				var parameter = values[index].parameter;
				parameters.push(parameter);
				delete parameter.mandatory;
			}
			current.configureParameters($container, parameters, node, mode, function (configuration) {
				for (var index = 0; index < values.length; index++) {
					var value = values[index];
					var parameter = value.parameter;
					var $element = _(parameter.id);
					var $group = $element.closest('.form-group');

					// Set the input value
					configuration.values[parameter.type](value, $element);

					// Handle the secured data flag
					if (parameter.secured && value.text === '-secured-') {
						// There is provided secured data
						$element.disable();
						// Add touch flag for secured values
						$group.addClass('untouched');
					}
				}

				// Notify the configuration is ready and all parameters are rendered
				callback && callback(configuration);
			});
		},

		/**
		 * Build node/subscription parameters: UI and configuration.
		 * Note this is an ansynchronous function thats requires the related node's context to render the parameter.
		 * @param {jQuery} $container Target container where the parameters will be redered..
		 * @param {Array} parameters Required parameters to complete the subscription.
		 * @param {string} node Node identifier to use for the target subscription.
		 * @param {string} mode Mode context : link, create, none,...
		 * @param {function} callback Optional callback(configuration) called when UI is rendered.
		 */
		configureParameters: function ($container, parameters, node, mode, callback) {
			current.configuration = null;
			current.$super('requireTool')(current, node, function ($tool) {
				/*
				 * Parameter configuration of new subscription wizard : validators, type of parameters, renderer,...
				 */
				var configuration = current.newSubscriptionParameterConfiguration(node, mode);
				current.configuration = configuration;
				configuration.parameters = {};
				$tool.configureSubscriptionParameters && $tool.configureSubscriptionParameters(configuration);
				var providers = configuration.providers;
				var renderers = configuration.renderers;
				var iProviders = providers.input;
				var cProviders = providers['form-group'];
				for (var index = 0; index < parameters.length; index++) {
					var parameter = parameters[index];
					var $input = (iProviders[parameter.id] || iProviders[parameter.type] || iProviders.standard)(parameter);
					(cProviders[parameter.id] || cProviders[parameter.type] || cProviders.standard)(parameter, $container, $input);

					// Post transformations
					renderers[parameter.type] && renderers[parameter.type](parameter, $input);
					renderers[parameter.id] && renderers[parameter.id](parameter, $input);

					// Secured
					parameter.secured && renderers.secured(parameter, $input);

					// Save the id based parameter store
					configuration.parameters[parameter.id] = parameter;
				}

				// Notify the configuration is ready and all parameters are rendered
				callback && callback(configuration);
			});
		},

		/**
		 * Create a new Select2 based on the selected node.
		 * @param {jquery} $input The UI component to render.
		 * @param {string} restUrl The remote data source URL.
		 * @param {function} formatResult Rendering function of the Select2 result.
		 * @param {function} changeHandler On 'change' callback.
		 * @param {object} parameter Parameter configuration.
		 * @param {function|string} customQuery Optional custom query appended to REST URL.
		 * @param {boolean} allowNew When true, new entries are accepted.
		 * @param {boolean} lowercase When true, the result are transformed in to lower case.
		 */
		newNodeSelect2: function ($input, restUrl, formatResult, changeHandler, parameter, customQuery, allowNew, lowercase) {
			return $input.select2({
				minimumInputLength: 1,
				formatResult: formatResult,
				allowClear: parameter.mandatory ? false : true,
				placeholder: parameter.mandatory ? undefined : current.$messages.optional,
				formatSelection: formatResult,
				createSearchChoice: allowNew && function (term) {
					return {
						id: (typeof lowercase === 'undefined' || lowercase) ? term.toLowerCase() : term,
						text: term,
						name: '<i class="fa fa-question-circle-o"></i> ' + term + '<div class="need-check">Need to be checked</div>'
					};
				},
				ajax: {
					url: function (term) {
						customQuery = (typeof customQuery === 'function') ? customQuery($input, restUrl, parameter) : (customQuery || (current.configuration.node + '/'));
						return REST_PATH + restUrl + customQuery + encodeURIComponent(term);
					},
					dataType: 'json',
					results: function (data) {
						return {
							results: data.data || data
						};
					}
				}
			}).on('change', changeHandler);
		},

		/**
		 * Check the inputs in the given selector and return true is all inputs are valid.
		 */
		validateSubscriptionParameters: function ($selector) {
			var validate = true;
			$selector.each(function () {
				var $that = $(this);
				var type = $that.attr('data-type');
				var id = $that.attr('id');
				var validators = current.configuration.validators;
				if (validators[id] && !validators[id]($that)) {
					validate = false;
					return;
				}
				if (validators[type] && !validators[type]($that)) {
					validate = false;
					return;
				}
			});
			return validate;
		},
	};
	return current;
});
