define(['cascade'], function ($cascade) {
	var current = {

		/**
		 * Tool parameters configuration for current subscription creation
		 * @type {object}
		 */
		parameterConfiguration: null,

		/**
		 * Edited project's identifier
		 */
		model: 0,

		/**
		 * Initialize subscription form
		 */
		initialize: function (parameters) {
			_('subscribe-definition').submit(function (event) {
				event.preventDefault();
				var $step = _('subscribe-definition').find('.nav-pills li.active');
				if ($step.next().length) {
					// Show next tab
					$step.next().find('a').tab('show');
				} else {
					// Final step, no target tab
					current.invokeSubscriptionWizardStep($step.index() + 1);
				}
				return false;
			}).on('change', 'input', function () {
				_('subscription-next').removeAttr('disabled');
			}).find('a[data-toggle="tab"]').on('show.bs.tab', current.configureSubscriptionTab).on('shown.bs.tab', function (e) {
				// Focus to the first available input
				$($(e.target).attr('href')).find('.choice.active').focus();
			});
			_('subscription-previous').on('click', function () {
				_('subscribe-definition').find('.nav-pills li.active').prev().find('a').tab('show');
			});
			
			// Node edition event
			$(document).off('node:saved').on('node:saved', '#node-popup', function(event, nodeComponent, relatedTarget) {
				// Check the popup event corresponds to the 'new node' button
				if ($(relatedTarget).is('.node-popup-trigger')) {
					// Reload the available nodes
					current.renderChoicesNodes();
				}
			}).off('node:show').on('node:show', '#node-popup', function(event, nodeComponent, relatedTarget) {
				// Preselect the tool
				if ($(relatedTarget).is('#subscription-new-node')) {
					// Reload the available nodes
					for(const index in current.tools) {
						if (current.tools[index].id  === current.getSelectedTool()) {
							nodeComponent.setModel({refined: current.tools[index]});
							break;
						} 
					}
				} else if ($(relatedTarget).is('#subscription-update-node')) {
					// Reload the available nodes
					for(const index in current.nodes) {
						if (current.nodes[index].id  === current.getSelectedNode()) {
							nodeComponent.setModel(current.nodes[index]);
							break;
						} 
					}
				}
			});
		},

		setModel: function(project){
			current.model = project;

			// Reset the UI
			validationManager.reset(_('subscribe-definition'));
			_('project').text(project.name);
			_('subscribe-parameters-container').empty();
			_('subscription-set-parameters').attr('disabled', 'disabled');
			_('subscribe-definition').removeClass('hidden').find('li,.choice').removeClass('active').end().find(':checked').removeAttr('checked');

			// Show first tab
			_('subscribe-definition').find('.nav-pills li').first().find('a').tab('show');
			current.$view.find('.cancel-subscription').attr('href', current.$parent.$url + '/' + project.id);
		},

		/**
		 * Configure UI of the current tab
		 * @param  {[Event]} e Event triggering the navigation.
		 */
		configureSubscriptionTab: function (e) {
			var $currentTab = $(e.target).closest('li');

			// Update pills
			$(e.relatedTarget).closest('li').removeClass('active').addClass('disabled');
			$currentTab.addClass('active').removeClass('disabled').removeClass('label-success').prev().addClass('label-success').removeClass('disabled');
			$currentTab.nextAll().removeClass('label-success').addClass('disabled');

			// Clear previous choices on restart
			$currentTab.closest('ul').children('li').filter(function () {
				return $(this).index() > $currentTab.index();
			}).find('a[data-toggle="tab"]').each(function () {
				$($(this).attr('href')).find('.choices').empty();
			});

			// Update buttons
			_('subscription-previous')[$currentTab.prev().length ? 'removeClass' : 'addClass']('hidden');
			_('subscription-next').addClass('hidden');
			_('subscription-create').addClass('hidden');
			current.invokeSubscriptionWizardStep($currentTab.index());
		},

		/**
		 * New subscription form
		 * @param {object} data Project data
		 */
		newSubscription: function (project) {
			// Subscription UI mode
			_('main').addClass('hidden');
			_('details').addClass('hidden');
			$('.subscribe-configuration').addClass('hidden');

			current.initializeSubscription();
			_('project').text(project.name);

			// Reset the UI
			validationManager.reset(_('subscribe-definition'));
			_('subscribe-parameters-container').empty();
			_('subscription-set-parameters').attr('disabled', 'disabled');
			_('subscribe-definition').removeClass('hidden').find('li,.choice').removeClass('active').end().find(':checked').removeAttr('checked');

			// Show first tab
			_('subscribe-definition').find('.nav-pills li').first().find('a').tab('show');
		},

		availableNextStep: function () {
			_('subscription-next').removeClass('hidden');
		},

		/**
		 * Invoke wizard operation corresponding to the given step.
		 * @param  {Integer} step Wizard step index : 0 to 5
		 */
		invokeSubscriptionWizardStep: function (step) {
			var parent;
			// Load the choices
			switch (step) {
				case 0:
					// Show services
					current.renderChoices('service', 'node?refined=service', true, current.availableNextStep);
					break;
				case 1:
					// Show tools
					current.renderChoicesTools();
					break;
				case 2:
					// Show nodes
					current.renderChoicesNodes();
					break;
				case 3:
					// Show modes
					parent = current.getSelectedTool();
					_('subscribe-mode').find('.choices').empty();
					current.renderChoicesData('mode', [
						current.newMode('create', 'plus'),
						current.newMode('link', 'link')
					], parent);
					current.availableNextStep();
					break;
				case 4:
					// Show parameters
					parent = current.getSelectedNode();
					current.parameterConfiguration = null;
					current.renderChoices('parameters', 'node/' + parent + '/parameter/' + (current.isSubscriptionCreateMode() ? 'CREATE' : 'LINK'), false, function (data) {
						current.configureSubscriptionParameters(parent, data, function (configuration) {
							// Configuration and validators are available
							current.parameterConfiguration = configuration;
							_('subscription-create').removeClass('hidden').trigger('focus');
						});
					}, parent);
					break;
				case 5 :
					// Create the subscription with provided parameters
					current.parameterConfiguration && current.createSubscription(current.parameterConfiguration);
					break;
				default :
		}
	},
	
	/**
	 * Render the choices of tools.
	 */
	renderChoicesTools : function() {
		var parent = _('subscribe-service').find('input:checked').val();
		current.renderChoices('tool', 'node?refined=' + parent + '&mode=link', true, current.availableNextStep, parent);
	},
	
	/**
	 * Render the choices of nodes.
	 */
	renderChoicesNodes : function() {
		var parent = current.getSelectedTool();
		current.renderChoices('node', 'node?refined=' + parent + '&mode=link', true, current.availableNextStep, parent);
	},

	/**
	 * Render choices
	 */
	renderChoices: function (type, url, renderData, callback, parent) {
		var $container = _('subscribe-' + type).find('.choices');
		var $description = $container.closest('.tab-pane').find('.choice-description');
		$container.html('<i class="loader fa fa-spin fa-refresh fa-5"></i>');
		$description.addClass('hidden').empty();
		$.ajax({
			dataType: 'json',
			url: REST_PATH + url,
			type: 'GET',
			success: function (nodes) {
				nodes = $.isArray(nodes.data) ? nodes.data : nodes;
				$container.empty();
				$description.addClass('hidden').empty();
				renderData && current.renderChoicesData(type, nodes, parent);
				if (!renderData || nodes.length) {
					// Save the nodes for new-node/update-node component
					current[type + 's'] = nodes;

					callback && callback(nodes);
				}
			}
		});
	},

	/**
	 * Renders the choices of the subscription.
	 * @param {string} type Node type : service, tool, node, parameters
	 * @param {Array} nodes The nodes to render.
	 * @param {string} parent Optional parent node identifier
	 */
	renderChoicesData: function (type, nodes, parent) {
		var icon;
		var node;
		var index;
		var $container = _('subscribe-' + type).find('.choices');
		var $name = _('subscribe-definition').find('.selected-' + type);
		for (index = 0; index < nodes.length; index++) {
			node = nodes[index];
			if (node.uiClasses) {
				// Use classes instead of picture
				icon = node.uiClasses.startsWith('$') ? '<span class="icon-text">' + node.uiClasses.substring(1) + '</span>' : ('<i class="' + node.uiClasses + '"></i>');
			} else {
				// Use a provided picture
				icon = current.$parent.$parent.getToolFromId(node.id) ? current.$parent.$parent.toIcon(node, 'x64w') : '<i class="fa fa-cloud"></i>';
			}
			$container.append($('<label class="choice btn"><input data-index="' + index + '" type="radio" name="s-choice-' + type + '" value="' + node.id + '" autocomplete="off"><div class="icon img-circle">' + icon + '</div>' + current.$main.getNodeName(node) + '</label>'));
		}

		// Description management
		$name.empty();

		var $inputs = $container.find('input[data-index]').off().on('change', function () {
			var $pane = $container.closest('.tab-pane');
			var $description = $pane.find('.choice-description');
			var mode;
			node = nodes[parseInt($(this).attr('data-index'), 10)];
			if (type === 'mode') {
				mode = node.id;
			} else {
				mode = node.mode || 'link';
			}
			_('subscribe-mode').removeClass('mode-create').removeClass('mode-link').addClass('mode-' + mode);
			$description.addClass('hidden').empty();
			node.description && $description.html(node.description).removeClass('hidden');
			if (current.$parent.$parent.getToolFromId(node.id)) {
				// Use provided image for 'img' node
				$name.html(current.$parent.$parent.toIconNameTool(node));
			} else {
				// Use classes of 'i' node
				$name.html('<span><i class="' + (node.uiClasses || 'fa fa-cloud') + '"></i></span><span>' + current.$main.getNodeName(node) + '</span>');
			}
		});
		if (type === 'mode') {
			_('subscribe-mode').find('label.choice.hidden').removeClass('hidden');
			_('subscribe-mode').filter('.mode-link').find('label.choice input[value="create"]').closest('label').addClass('hidden');
		} else {
			_('subscribe-mode').removeClass('mode-create').removeClass('mode-link');
		}
		if ($inputs.closest('.choice:not(.hidden)').first().find('input[data-index]').prop('checked', 'checked').trigger('change').closest('.choice').addClass('active').focus()) {
			_('subscription-next').removeAttr('disabled');
		}
		if (type === 'node') {
			// Add the button to create/update a node
			$('#subscription-new-node').removeClass('hidden').data('parent', parent);
			if (current.getSelectedNode()) {
				$('#subscription-update-node').removeClass('hidden');
			} else {
				$('#subscription-update-node').addClass('hidden');
			}
		} else {
			$('.node-popup-trigger').addClass('hidden');
		}
	},

	/**
	 * Build the JSON String of the ubscription creation form.
	 */
	formSubscriptionToJSON: function () {
		var parameters = [];
		var i = 0;
		_('subscribe-parameters-container').find('input[data-type]').each(function () {
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
		return JSON.stringify({
			node: current.getSelectedNode(),
			project: current.model.id,
			parameters: parameters,
			mode: current.isSubscriptionCreateMode() ? 'create' : 'link'
		});
	},

	/**
	 * Hold the parameter generation configuration : UI input, validator, UI component
	 */
	newSubscriptionParameterConfiguration: function () {
		var configuration = {
			validators: {
				integer: function (element) {
					var intRegex = /^\d*$/;
					if (intRegex.test(element.val())) {
						validationManager.reset(element.closest('.form-group'));
						return true;
					}
					validationManager.addError(element, {
						rule: 'Integer'
					}, element.attr('id'));
					return false;
				}
			},
			renderers: {
				select: function (parameter, element) {
					element.select2({data: parameter.values});
				},
				multiple: function (parameter, element) {
					element.select2({multiple: true, data: parameter.values});
				},
				binary: function (parameter, element) {
					element.attr('type', 'checkbox');
				},
				tags: function (parameter, element) {
					element.select2({multiple: true, tags: parameter.values});
				},
				integer: function (parameter, element) {
					element.on('change', function () {
						configuration.validators.integer(element);
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
	 * Create a new Select2 based on the selected node.
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
					return REST_PATH + restUrl + (customQuery || (current.getSelectedNode() + '/')) + encodeURIComponent(term);
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
			current.newNodeSelect2($input, restUrl, current.$parent.$parent.toName, function (e) {
				_(id + '_alert').parent().remove();
				if (e.added && e.added.id) {
					$input.next().after('<div><br><div id="' + id + '_alert" class="well">' + current.$messages.id + ': ' + e.added.id + (e.added.name ? '<br>' + current.$messages.name + ': ' + e.added.name : '') + (e.added.key || e.added.pkey ? '<br>' + current.$messages.pkey + ': ' + (e.added.key || e.added.pkey) : '') + (e.added.description ? '<br>' + current.$messages.description + ': ' + e.added.description : '') + (e.added['new'] ? '<br><i class="fa fa-warning"></i> ' + current.$messages['new'] : '') + '</div></div>');
				}
				changeHandler && changeHandler();
			}, parameter, customQuery, allowNew, lowercase);
		};
	},

	/**
	 * Build subscription parameters.
	 * @param node Node to use for the target subscription.
	 * @param parameters Required parameters to complete the subscription.
	 */
	configureSubscriptionParameters: function (node, parameters, callback) {
		current.$parent.$parent.requireTool(current, node, function ($tool) {
			/*
			 * Parameter configuration of new subscription wizard : validators, type of parameters, renderer,...
			 */
			var c = _('subscribe-parameters-container');
			var configuration = current.newSubscriptionParameterConfiguration();
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

	/**
	 * Persist a new subscription from its definition and parameters.
	 */
	createSubscription: function (configuration) {
		var validate = current.validateSubscriptionParameters(configuration, _('subscribe-parameters-container').find('input[data-type]'));
		if (!validate) {
			// At least one error, validation manager has already managed the UI errors
			return;
		}

		$.ajax({
			type: 'POST',
			url: REST_PATH + 'subscription',
			dataType: 'json',
			contentType: 'application/json',
			data: current.formSubscriptionToJSON(),
			success: function (id) {
				notifyManager.notify(Handlebars.compile(current.$messages.created)(id));
				_('subscribe-definition').trigger('subscribe:saved');
			}
		});
	},

	newMode: function (mode, uiClass) {
		return {
			id: mode,
			name: current.$messages['mode-' + mode],
			uiClasses: 'fa fa-' + uiClass,
			description: current.$messages['mode-' + mode + '-description']
		};
	},

	/**
	 * Indicate the current subscription is in create mode.
	 */
	isSubscriptionCreateMode: function () {
		return _('subscribe-mode').hasClass('mode-create');
	},

	/**
	 * Return selected node identifier of current subscription form.
	 */
	getSelectedNode: function () {
		return _('subscribe-node').find('input:checked').val();
	},

	/**
	 * Return selected tool identifier of current subscription form.
	 */
	getSelectedTool: function () {
		return _('subscribe-tool').find('input:checked').val();
	}
};
return current;
});
