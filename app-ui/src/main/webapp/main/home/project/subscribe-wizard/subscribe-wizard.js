/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
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
			_('subscribe-definition').submit(current.goToNextStep)
			.on('change', 'input', function () {
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
					nodeComponent.setModel({
						refined: _('subscribe-tool').find('input:checked').data('node')
					});
				} else if ($(relatedTarget).is('#subscription-update-node')) {
					// Reload the available nodes
					nodeComponent.setModel(_('subscribe-node').find('input:checked').data('node'));
				}
			});
		},

		goToNextStep: function(event) {
			event && event.preventDefault();
			var $step = _('subscribe-definition').find('.nav-pills li.active');
			if ($step.next().length) {
				// Show next tab
				$step.next().find('a').tab('show');
			} else {
				// Final step, no target tab
				current.invokeSubscriptionWizardStep($step.index() + 1);
			}
			return false;
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
				var tool = _('subscribe-tool').find('input:checked').data('node');
				var modes = [];
				if (tool.mode === 'all' || tool.mode === 'create') {
					modes.push(current.newMode('create', 'plus'));
				}
				if (tool.mode === 'all' || tool.mode === 'link') {
					modes.push(current.newMode('link', 'link'));
				}
				_('subscribe-mode').find('.choices').empty();
				current.renderChoicesData('mode', modes);
				current.availableNextStep();
				break;
			case 4:
				// Show parameters
				var parent = current.getSelectedNode();
				var mode = _('subscribe-mode').find('input:checked').val();
				_('subscription-create').removeClass('hidden').disable();
				current.renderChoices('parameters', 'node/' + parent + '/parameter/' + mode.toUpperCase(), false, function (data) {
					$cascade.loadFragment(current, current.$transaction, 'main/home/node-parameter', 'node-parameter', {
						callback: function (context) {
							current.parameterContext = context;
							_('subscribe-parameters').find('.choices').empty();
							context.configureParameters(_('subscribe-parameters-container'), data, parent, mode, parent, function () {
								// Configuration and validators are available
								_('subscription-create').enable().trigger('focus');
							});
						},
						plugins: ['i18n', 'css', 'js']
					});
				}, parent);
				break;
			case 5:
				// Create the subscription with provided parameters
				current.parameterContext && current.createSubscription();
				break;
			default:
			}
		},

		/**
		 * Render the choices of tools.
		 */
		renderChoicesTools: function () {
			var parent = _('subscribe-service').find('input:checked').val();
			current.renderChoices('tool', 'node?refined=' + parent, true, current.availableNextStep, parent);
		},

		/**
		 * Render the choices of nodes.
		 */
		renderChoicesNodes: function () {
			var parent = _('subscribe-tool').find('input:checked').val();
			current.renderChoices('node', 'node?refined=' + parent, true, current.availableNextStep, parent);
		},

		/**
		 * Render choices
		 */
		renderChoices: function (type, url, renderData, callback, parent) {
			var $container = _('subscribe-' + type).find('.choices');
			var $description = $container.closest('.tab-pane').find('.choice-description');
			$container.html('<i class="loader fas fa-spin fa-sync-alt fa-5"></i>');
			$description.addClass('hidden').empty();
			$.ajax({
				dataType: 'json',
				url: REST_PATH + url + (url.indexOf('?') === -1 ? '?' : '&') + 'rows=1000',
				type: 'GET',
				success: function (nodes) {
					nodes = $.isArray(nodes.data) ? nodes.data : nodes;
					$description.addClass('hidden').empty();
					if (renderData) {
						$container.empty();
						current.renderChoicesData(type, nodes, parent);
					}
					if (!renderData || nodes.length) {
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
			var $container = _('subscribe-' + type).find('.choices');
			
			// Nodes, inside the container : center panel
			current.renderNodes($container, nodes, type);

			// Description : left panel
			var $inputs = current.renderDescriptionPanel($container, nodes, type);

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
		
		renderNodes: function($container, nodes, type) {
			for (var index = 0; index < nodes.length; index++) {
				var node = nodes[index];
				var icon;
				if (node.uiClasses) {
					// Use classes instead of picture
					icon = current.toUiClassIcon(node.uiClasses);
				} else if (node.refined && node.refined.uiClasses && node.refined.refined) {
					// Use the parent node UI classes for this node instance
					icon = current.toUiClassIcon(node.refined.refined.uiClasses);
				} else {
					// Use a provided picture
					icon = current.$super('getToolFromId')(node.id) ? current.$super('toIcon')(node, 'x64w') : '<i class="fas fa-cloud"></i>';
				}
				var $choice = $('<label class="choice btn"><input data-index="' + index + '" type="radio" name="s-choice-' + type + '" value="' + node.id + '" autocomplete="off"><div class="icon img-circle">' + icon + '</div>' + current.$main.getNodeName(node) + '</label>');
				$container.append($choice);
				
				// Save the context
				$choice.find('input').data('node', node);

				$choice.on('dblclick', current.goToNextStep);
			}
		},

		/**
		 * Return the icon markup corresponding to the given UI classes.
		 */
		toUiClassIcon: function(uiClasses) {
			return uiClasses.startsWith('$') ? '<span class="icon-text">' + uiClasses.substring(1) + '</span>' : ('<i class="' + uiClasses + '"></i>');
		},

		renderDescriptionPanel: function($container, nodes, type) {
			var $name = _('subscribe-definition').find('.selected-' + type).empty();
			return $container.find('input[data-index]').off().on('change', function () {
				var $pane = $container.closest('.tab-pane');
				var $description = $pane.find('.choice-description');
				var mode;
				var node = nodes[parseInt($(this).attr('data-index'), 10)];
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
					$name.html('<span><i class="' + (node.uiClasses || 'fas fa-cloud') + '"></i></span><span>' + current.$main.getNodeName(node) + '</span>');
				}
			});
		},

		/**
		 * Build the JSON String of the subscription creation form.
		 */
		formSubscriptionToJSON: function ($container) {
			return JSON.stringify({
				node: current.getSelectedNode(),
				project: current.model.id,
				parameters: current.parameterContext.getParameterValues($container),
				mode: current.parameterContext.configuration.mode
			});
		},

		/**
		 * Persist a new subscription from its definition and parameters.
		 */
		createSubscription: function () {
			var $container = _('subscribe-parameters-container');
			if (!current.parameterContext.validateSubscriptionParameters($container.find('input[data-type]'))) {
				// At least one error, validation manager has already managed the UI errors
				return;
			}

			
			// Persist the subscription
			_('subscription-create').disable();
			$.ajax({
				type: 'POST',
				url: REST_PATH + 'subscription',
				dataType: 'json',
				contentType: 'application/json',
				data: current.formSubscriptionToJSON($container),
				success: function (id) {
					notifyManager.notify(Handlebars.compile(current.$messages.created)(id));
					_('subscribe-definition').trigger('subscribe:saved');
				},
				error: function () {
					_('subscription-create').enable();
				}
			});
		},

		newMode: function (mode, uiClass) {
			return {
				id: mode,
				name: current.$messages['mode-' + mode],
				uiClasses: 'fas fa-' + uiClass,
				description: current.$messages['mode-' + mode + '-description']
			};
		},

		/**
		 * Return selected node UI of current subscription form.
		 */
		getSelectedNode: function () {
			return _('subscribe-node').find('input:checked').val();
		}

	};
	return current;
});
