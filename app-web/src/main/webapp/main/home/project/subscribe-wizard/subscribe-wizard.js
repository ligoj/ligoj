define(['cascade'], function ($cascade) {
	var current = {

		/**
		 * Edited project's identifier
		 */
		model: 0,

		/**
		 * Cascade context of parameter management.
		 */
		parameterContext: null,

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
				_('subscription-next').enable();
			}).find('a[data-toggle="tab"]').on('show.bs.tab', current.configureSubscriptionTab).on('shown.bs.tab', function (e) {
				// Focus to the first available input
				$($(e.target).attr('href')).find('.choice.active').focus();
			});
			_('subscription-previous').on('click', function () {
				_('subscribe-definition').find('.nav-pills li.active').prev().find('a').tab('show');
			});

			// Node edition event
			$(document).off('node:saved').on('node:saved', '#node-popup', function (event, nodeComponent, relatedTarget) {
				// Check the popup event corresponds to the 'new node' button
				if ($(relatedTarget).is('.node-popup-trigger')) {
					// Reload the available nodes
					current.renderChoicesNodes();
				}
			}).off('node:show').on('node:show', '#node-popup', function (event, nodeComponent, relatedTarget) {
				// Preselect the tool
				if ($(relatedTarget).is('#subscription-new-node')) {
					// Reload the available nodes
					for (const index in current.tools) {
						if (current.tools[index].id === current.getSelectedTool()) {
							nodeComponent.setModel({
								refined: current.tools[index]
							});
							break;
						}
					}
				} else if ($(relatedTarget).is('#subscription-update-node')) {
					// Reload the available nodes
					for (const index in current.nodes) {
						if (current.nodes[index].id === current.getSelectedNode()) {
							nodeComponent.setModel(current.nodes[index]);
							break;
						}
					}
				}
			});
		},

		setModel: function (project) {
			current.model = project;

			// Reset the UI
			validationManager.reset(_('subscribe-definition'));
			_('project').text(project.name);
			_('subscribe-parameters-container').empty();
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
			$(e.relatedTarget).closest('li').removeClass('active').disable();
			$currentTab.addClass('active').enable().removeClass('label-success').prev().addClass('label-success').enable();
			$currentTab.nextAll().removeClass('label-success').disable();

			// Clear previous choices on restart
			$currentTab.closest('ul').children('li').filter(function () {
				return $(this).index() > $currentTab.index();
			}).find('a[data-toggle="tab"]').each(function () {
				$($(this).attr('href')).find('.choices').empty();
			});

			// Update buttons
			_('subscription-previous')[$currentTab.prev().length ? 'removeClass' : 'addClass']('hidden');
			_('subscription-next').addClass('hidden');
			_('subscription-create').addClass('hidden').disable();
			current.invokeSubscriptionWizardStep($currentTab.index());
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
				var mode = (current.isSubscriptionCreateMode() ? 'create' : 'link');
				_('subscription-create').removeClass('hidden').disable();
				current.renderChoices('parameters', 'node/' + parent + '/parameter/' + mode.toUpperCase(), false, function (data) {
					$cascade.loadFragment(current, current.$transaction, 'main/home/node-parameter', 'node-parameter', {
						callback: function (context) {
							current.parameterContext = context;
							_('subscribe-parameters').find('.choices').empty()
							context.configureParameters(_('subscribe-parameters-container'), data, parent, mode, function () {
								// Configuration and validators are available
								_('subscription-create').enable().trigger('focus');
							});
						},
						plugins: ['i18n', 'js']
					});
				}, parent);
				break;
			case 5:
				// Create the subscription with provided parameters
				current.parameterContext.configuration && current.createSubscription(current.parameterContext.configuration);
				break;
			default:
			}
		},

		/**
		 * Render the choices of tools.
		 */
		renderChoicesTools: function () {
			var parent = _('subscribe-service').find('input:checked').val();
			current.renderChoices('tool', 'node?refined=' + parent + '&mode=link', true, current.availableNextStep, parent);
		},

		/**
		 * Render the choices of nodes.
		 */
		renderChoicesNodes: function () {
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
					$description.addClass('hidden').empty();
					renderData && $container.empty() && current.renderChoicesData(type, nodes, parent);
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
			var $container = _('subscribe-' + type).find('.choices');
			var $name = _('subscribe-definition').find('.selected-' + type);
			for (const index in nodes) {
				node = nodes[index];
				if (node.uiClasses) {
					// Use classes instead of picture
					icon = node.uiClasses.startsWith('$') ? '<span class="icon-text">' + node.uiClasses.substring(1) + '</span>' : ('<i class="' + node.uiClasses + '"></i>');
				} else {
					// Use a provided picture
					icon = current.$super('getToolFromId')(node.id) ? current.$super('toIcon')(node, 'x64w') : '<i class="fa fa-cloud"></i>';
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
				if (current.$super('getToolFromId')(node.id)) {
					// Use provided image for 'img' node
					$name.html(current.$super('toIconNameTool')(node));
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
				_('subscription-next').enable();
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
		 * Build the JSON String of the subscription creation form.
		 */
		formSubscriptionToJSON: function ($container) {
			return JSON.stringify({
				node: current.getSelectedNode(),
				project: current.model.id,
				parameters: current.parameterContext.getParameters($container),
				mode: current.isSubscriptionCreateMode() ? 'create' : 'link'
			});
		},

		/**
		 * Persist a new subscription from its definition and parameters.
		 */
		createSubscription: function (configuration) {
			var $container = _('subscribe-parameters-container');
			if (!current.parameterContext.validateSubscriptionParameters(configuration, $container.find('input[data-type]'))) {
				// At least one error, validation manager has already managed the UI errors
				return;
			}

			$.ajax({
				type: 'POST',
				url: REST_PATH + 'subscription',
				dataType: 'json',
				contentType: 'application/json',
				data: current.formSubscriptionToJSON($container),
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
