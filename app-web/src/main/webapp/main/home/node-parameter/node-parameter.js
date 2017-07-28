define(['cascade'], function ($cascade) {
	var current = {


		/**
		 * Tool parameters configuration for current subscription creation
		 * @type {object}
		 */
		configuration : null,
		initialize: function () {},
		
		/**
		 * Return the parameter values inside the given container and configure the validation mapping.
		 */
		getParameters : function($container) {
			var parameters = [];
			var i = 0;
			$container.find('input[data-type]').each(function () {
				var $that = $(this);
				var type = $that.attr('data-type');
				var id = $that.attr('id');
				validationManager.mapping['parameters[' + i + '].parameter'] = id;
				validationManager.mapping[id] = id;
				var parameter = {
					parameter: id,
					selections: type === 'multiple' ? $that.select2('val') : undefined,
					tags: type === 'tags' ? $that.select2('val') : undefined,
					index: type === 'select' ? $that.val() : undefined,
					binary: type === 'binary' ? $that.is(':checked') : undefined,
					integer: type === 'integer' && $that.val() ? parseInt($that.val(), 10) : undefined,
					text: type === 'text' ? $that.val() : undefined,
					date: type === 'date' ? moment($that.val(), formatManager.messages.shortdateMomentJs).valueOf() : undefined
				};
				parameters.push(parameter);
				i++;
			});
			return parameters;
		},
	
		/**
		 * Hold the parameter generation configuration : UI input, validator, UI component
		 */
		newSubscriptionParameterConfiguration: function (node) {
			var configuration = {
				node: node,
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
				renderers: {
					select: function (parameter, $element) {
						$element.select2({data: parameter.values});
					},
					multiple: function (parameter, $element) {
						$element.select2({multiple: true, data: parameter.values});
					},
					binary: function (parameter, $element) {
						$element.attr('type', 'checkbox');
					},
					tags: function (parameter, $element) {
						$element.select2({multiple: true, tags: parameter.values});
					},
					integer: function (parameter, $element) {
						$element.on('change', function () {
							configuration.validators.integer($element);
						});
					}
				},
				providers: {
					'input': {
						standard: function (parameter) {
							// Create a basic input, manages type, id, required
							return $('<input class="form-control" type="' + (/password/.test(parameter.id) ? 'password' : 'text') + '" autocomplete="off" data-type="' + parameter.type + '" id="' + parameter.id + '"' + (parameter.mandatory ? ' required' : '') + '>');
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
							var id = parameter.id;
							var validator = configuration.validators[id];
							var name = current.$messages[id] || parameter.name || '';
							var description = current.$messages[id + '-description'] || parameter.description;
							description = description ? ('<span class="help-block">' + description + '</span>') : '';
							var $dom = $('<div class="form-group' + required + '"><label class="control-label" for="' + id + '">' + name + '</label><div>' + description + '</div></div>');
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
		 * Build node/subscription parameters.
		 * @param node Node identifier to use for the target subscription.
		 * @param parameters Required parameters to complete the subscription.
		 */
		configureParameters: function (node, parameters, callback) {
			current.configuration = null;
			current.$super('requireTool')(current, node, function ($tool) {
				/*
				 * Parameter configuration of new subscription wizard : validators, type of parameters, renderer,...
				 */
				var c = _('subscribe-parameters-container');
				var configuration = current.newSubscriptionParameterConfiguration(node);
				current.configuration = configuration;
				$tool.configureSubscriptionParameters && $tool.configureSubscriptionParameters(configuration);
				var providers = configuration.providers;
				var renderers = configuration.renderers;
				var iProviders = providers.input;
				var cProviders = providers['form-group'];
				var i;
				var parameter;
				var $input;
				for (i = 0; i < parameters.length; i++) {
					parameter = parameters[i];
					$input = (iProviders[parameter.id] || iProviders[parameter.type] || iProviders.standard)(parameter, undefined);
					(cProviders[parameter.id] || cProviders[parameter.type] || cProviders.standard)(parameter, c, $input);
	
					// Post transformations
					renderers[parameter.type] && renderers[parameter.type](parameter, $input);
					renderers[parameter.id] && renderers[parameter.id](parameter, $input);
				}
	
				// Expose the configuration
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
		validateSubscriptionParameters: function (configuration, $selector) {
			var validate = true;
			$selector.each(function () {
				var $that = $(this);
				var type = $that.attr('data-type');
				var id = $that.attr('id');
				var validators = configuration.validators;
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
