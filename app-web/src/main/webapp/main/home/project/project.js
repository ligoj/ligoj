define(['cascade'], function ($cascade) {
	var current = {
		/**
		 * Projects table
		 */
		table: null,

		/**
		 * Subscriptions table
		 */
		subscriptions: null,

		/**
		 * Flag objects
		 */
		form: false,
		search: false,
		subscribe: false,
		model: null,

		/**
		 * Tool parameters configuration for current subscription creation
		 * @type {object}
		 */
		parameterConfiguration: null,

		/**
		 * Edited project's identifier
		 */
		currentId: 0,

		initialize: function (parameters) {
			current.$view.on('click', '.cancel-subscription', function () {
				window.location.replace(current.$url + '/' + current.currentId);
			});

			// QR Code management
			$('.qrcode-toggle').on('click', function () {
				$(this).find('.fa-qrcode').toggleClass('hidden').end().find('.qrcode').toggleClass('hidden').filter(':not(.hidden)').each(function () {
					var $container = $(this).empty();
					require(['./qrcode/jquery-qrcode'], function () {
						$($container[0]).qrcode({
							text: window.location.href,
							size: 128,
							background: '#ffffff'
						});
					});
				});
			});
			this.onHashChange(parameters);
		},

		/**
		 * Manage internal navigation.
		 */
		onHashChange: function (parameter) {
			if (parameter) {
				var parameters = parameter.split('/');
				var id = parseInt(parameters[0], 10);
				if (parameters.length === 1) {
					// Project mode
					current.loadProject(id);
				} else if (parameters.length === 2) {
					// Subscription creation mode
					current.loadProject(id, current.newSubscription);
				} else {
					// Subscription configuration mode
					current.loadProject(id, function () {
						current.loadSubscriptionConfiguration(parseInt(parameters[2], 10));
					});
				}
			} else {
				// Search mode
				current.currentId = null;
				current.mode = null;
				current.loadProjects();
			}
		},

		/**
		 * Search mode
		 */
		loadProjects: function () {
			current.initializeSearch();
			_('details').addClass('hide');
			$('.subscribe-configuration').addClass('hide');
			_('main').removeClass('hide');
			$(function() {
				_('entityTable_filter').find('input').trigger('focus');
			});
		},

		/**
		 * Project mode, load project where id = current.currentId
		 */
		loadProject: function (id, callback) {
			// Restore QR Code position
			$('.qrcode-toggle').find('.fa-qrcode').removeClass('hidden').end().find('.qrcode').addClass('hidden');

			if ((typeof callback === 'undefined')) {
				// Display the project UI
				$('.subscribe-configuration').addClass('hide');
				_('main').addClass('hide');
			}
			if (id === current.currentId) {
				// Project is already loaded, cache useless Ajax call, display the details
				_('details').removeClass('hide');
				callback && callback(current.model);
			} else {
				$cascade.appendSpin(current.$view, 'fa-4x', 'fa fa-circle-o faa-burst animated centered');
				$.ajax({
					dataType: 'json',
					url: REST_PATH + 'project/' + id,
					type: 'GET',
					success: function (data) {
						current.model = data;
						current.fillForm(data);
						_('details').removeClass('hide');
						callback && callback(data);
					}
				});
			}
		},

		/**
		 * Initialize the search UI components
		 */
		initializeSearch: function () {
			if (current.search) {
				return;
			}
			current.search = true;

			// Project edition pop-up
			_('popup').on('shown.bs.modal', function () {
				_('name').focus();
			}).on('show.bs.modal', function (event) {
				validationManager.reset(_('popup'));
				var $source = $(event.relatedTarget);
				var uc = $source.length && current.table.fnGetData($source.closest('tr')[0]);
				uc = uc && uc.id ? uc : {};
				_('name').val(uc.name || '');
				_('pkey').prop('disabled', uc.nbSubscriptions > 0).select2('val', uc.pkey || '');
				_('teamLeader').select2('data', uc.id ? uc.teamLeader : {
					id: current.$session.userName
				});
				_('description').val(uc.description || '');
				current.currentId = uc.id || 0;
			}).on('submit', function (e) {
				e.preventDefault();
				current.save();
			}).on('hide.bs.modal', function () {
				current.currentId = 0;
			});

			_('name').on('change', function () {
				if (!_('pkey').prop('disabled')) {
					var pkeys = current.generatePKeys(_('name').val());
					_('pkey').select2('val', pkeys.length ? pkeys[0] : null);
				}
			});
			_('pkey').select2({
				initSelection: function (element, callback) {
					var data = {
						id: element.val(),
						text: element.val()
					};
					callback(data);
				},
				query: function (query) {
					var pkeys;
					var index;
					var data = {
						results: []
					};
					if (query.term) {
						pkeys = current.generatePKeys(query.term);
						if (pkeys.length) {
							data.results.push({id: pkeys[0], text: pkeys[0]});
						}
					}
					if (_('name').val()) {
						pkeys = current.generatePKeys(_('name').val());
						for (index = 0; index < pkeys.length; index++) {
							data.results.push({id: pkeys[index], text: pkeys[index]});
						}
					}
					query.callback(data);
				}
			});
			current.$main.newSelect2User('#teamLeader');

			// Also initialize the datatables component
			current.initializeDataTable();
		},

		/**
		 * Generate PKeys from a name.
		 */
		generatePKeys: function (name) {
			var result = [];
			var words = current.$main.normalize(name).split(' ');
			var index;
			for (index = 1; index <= words.length; index++) {
				result.splice(0, 0, words.slice(0, index).join('-'));
			}
			return result;
		},

		/**
		 * Initialize the projects datatables (server AJAX)
		 */
		initializeDataTable: function () {
			current.table = $('#entityTable').dataTable({
				dom: '<"row table-tools"<"col-xs-5"B><"col-xs-7"f>r>t<"row"<"col-xs-6"i><"col-xs-6"p>>',
				serverSide: true,
				searching: true,
				ajax: REST_PATH + 'project',
				createdRow: function (nRow) {
					$(nRow).find('.delete').on('click', current.deleteProject);
				},
				columns: [
					{
						data: 'name',
						width: '200px',
						className: 'truncate',
						render: function (_i, _j, data) {
							return '<a href="' + current.$url + '/' + data.id + '">' + data.name + '</a>';
						}
					}, {
						data: 'description',
						className: 'hidden-xs hidden-sm truncate'
					}, {
						data: 'teamLeader',
						className: 'hidden-xs truncate responsive-user',
						orderable: false,
						render: function (_i, _j, data) {
							if (data.teamLeader && data.teamLeader.id) {
								return current.$main.getUserLink(data.teamLeader);
							}
						}
					}, {
						data: 'createdDate',
						className: 'hidden-xs hidden-sm hidden-md truncate responsive-date',
						render: function (_i, _j, data) {
							return moment(data.createdDate).format(formatManager.messages.shortdateMomentJs);
						}
					}, {
						data: 'nbSubscriptions',
						width: '16px'
					}, {
						data: null,
						width: '48px',
						orderable: false,
						render: function () {
							var editlink = '<a class="update" data-toggle="modal" data-target="#popup"><i class="fa fa-pencil" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a>';
							return editlink + '<a class="delete"><i class="fa fa-removefa fa-remove" data-toggle="tooltip" title="' + current.$messages['delete'] + '"></i></a>';
						}
					}
				],
				buttons: securityManager.isAllowedBusiness('project', 'post,put') ? [
					{
						extend: 'popup',
						className: 'btn-success btn-raised'
					}
				] : []
			});
		},

		formToJSON: function () {
			return JSON.stringify({id: current.currentId, name: _('name').val(), pkey: _('pkey').val(), teamLeader: _('teamLeader').val(), description: _('description').val()});
		},

		save: function () {
			_('confirmCreate').button('loading');
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'project',
				dataType: 'json',
				contentType: 'application/json',
				data: current.formToJSON(),
				success: function (id) {
					notifyManager.notify(Handlebars.compile(current.$messages[current.currentId ? 'updated' : 'created'])(current.currentId || id));
					_('popup').modal('hide');
					current.table && current.table.api().ajax.reload();
					if (id) {
						window.location.replace(current.$url + '/' + id);
					}
				},
				complete: function () {
					_('confirmCreate').button('complete');
				}
			});
		},

		cancel: function () {
			if (current.currentId === 0) {
				window.location.replace(current.$url);
			}
		},

		/**
		 * Delete the selected project after popup confirmation, or directly from its identifier.
		 */
		deleteProject: function (id, name) {
			if ((typeof id) === 'number') {
				// Delete without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'project/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.deleted)(name));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				bootbox.confirmDelete(function (confirmed) {
					confirmed && current.deleteProject(entity.id, entity.name);
				}, entity.name);
			}
		},

		/**
		 * Initialize project's form
		 */
		initializeForm: function () {
			if (current.form) {
				return;
			}
			current.form = true;
			_('cancel').click(current.cancel);
			_('save').click(current.save);

			$cascade.trigger('html', _('details'));
		},

		fillForm: function (project) {
			current.initializeForm();
			current.currentId = project ? project.id : 0;
			var name = project ? project.name + ' (' + project.pkey + ')' : '';
			$('.project-name').text(name);

			if (project.description) {
				_('detail-description').text(project.description).removeClass('hide');
			} else {
				_('detail-description').addClass('hide');
			}

			// Audit project
			current.$main.fillAuditData(project);

			// Load all tools configurations
			var counter = project.subscriptions.length;
			var $nodes = {};
			if (counter === 0) {
				// No subscriptions, no configuration to load
				current.fillSubscriptionsTable(project, $nodes);
			} else {
				// Invalidate the previous rows during this load
				if (current.subscriptions) {
					current.subscriptions.fnClearTable(true);
					_('subscriptions').find('tbody tr td').html(current.$messages.loading);
				}

				// Load the required plug-ins
				$.each(project.subscriptions, function (index) {
					var subscription = project.subscriptions[index];
					var node = subscription.node.id;
					subscription.project = project.id;
					current.$parent.requireTool(current, node, function ($tool) {
						$nodes[node] = $tool;
						if (counter-- === 1) {
							current.fillSubscriptionsTable(project, $nodes);
						}
					});
				});
			}
		},

		counter0: 0,

		/**
		 * Fill the datatables of subscription, no AJAX, laready loaded with the project's detail.
		 */
		fillSubscriptionsTable: function (project, $nodes) {
			current.subscriptions = _('subscriptions').dataTable({
				dom: '<"row"<"col-xs-6"B>>t',
				pageLength: -1,
				destroy: true,
				order: [[2, 'asc']],
				data: project.subscriptions,
				createdRow: function (nRow, subscription) {
					$(nRow).addClass(subscription.node.id.replace(/:/g, '-')).addClass(subscription.node.refined.id.replace(/:/g, '-')).addClass(subscription.node.service.id.replace(/:/g, '-')).attr('data-subscription', subscription.id).attr('data-id', subscription.id).find('.unsubscribe, .delete').on('click', current.unsubscribe);
					current.$parent.applySubscriptionStyle($(nRow), subscription, false);
				},
				columns: [
					{
						data: 'null',
						className: 'status',
						orderable: false
					}, {
						data: 'node',
						className: 'hidden-xs hidden-sm truncate service',
						render: function (_i, _j, subscription) {
							var id = current.$parent.getServiceFromNode(subscription.node).id;
							var label = current.$messages[id] || id;
							return label;
						}
					}, {
						data: 'tool',
						className: 'icon-xs',
						render: function (_i, _j, subscription) {
							return current.$parent.toIconNameTool(subscription.node);
						}
					}, {
						data: null,
						className: 'truncate key rendered',
						render: function (_i, _j, subscription) {
							return current.$parent.render(subscription, 'renderKey', $nodes[subscription.node.id]);
						}
					}, {
						data: 'createdDate',
						className: 'hidden-xs hidden-sm hidden-md truncate responsive-date',
						render: function (_i, _j, subscription) {
							return moment(subscription.createdDate).format(formatManager.messages.shortdateMomentJs);
						}
					}, {
						data: null,
						orderable: false,
						className: 'features rendered',
						render: function (_i, _j, subscription) {
							return current.$parent.render(subscription, 'renderFeatures', $nodes[subscription.node.id]);
						}
					}, {
						data: null,
						className: 'hidden-xs hidden-sm',
						orderable: false,
						bVisible: project.manageSubscriptions,
						render: function (_i, _j, subscription) {
							if (project.manageSubscriptions) {
								return '<a class="unsubscribe"><i class="fa fa-remove" data-toggle="tooltip" title="' + current.$messages.unsubscribe + '"></i></a>' + ((subscription.node.refined.mode === 'create' || subscription.node.mode === 'create') ? '<a class="delete"><i class="fa fa-trash" data-toggle="tooltip" title="' + current.$messages['delete-subscription'] + '"></i></a>' : '');
							}
							return '&nbsp';
						}
					}
				],
				buttons: project.manageSubscriptions ? [
					{
						extend: 'create',
						text: current.$messages.subscribe,
						init: function (_i, $button) {
							$button.off('click.dtb').attr('href', current.$url + '/' + current.currentId + '/subscription');
						}
					}
				] : []
			});
			// Launch Ajax requests to refresh statuses just after the table has been rendered
			for (var index = 0; index < project.subscriptions.length; index++) {
				current.$parent.refreshSubscription(project.subscriptions[index]);
			}

			// Remove the spin
			$cascade.removeSpin(current.$view);
		},

		/**
		 * Initialize subscription form
		 */
		initializeSubscription: function () {
			if (current.subscribe) {
				return;
			}
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
			current.subscribe = true;
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
			_('subscription-previous')[$currentTab.prev().length ? 'removeClass' : 'addClass']('hide');
			_('subscription-next').addClass('hide');
			_('subscription-create').addClass('hide');
			current.invokeSubscriptionWizardStep($currentTab.index());
		},

		/**
		 * New subscription form
		 * @param {object} data Project data
		 */
		newSubscription: function (project) {
			// Subscription UI mode
			_('main').addClass('hide');
			_('details').addClass('hide');
			$('.subscribe-configuration').addClass('hide');

			current.initializeSubscription();
			_('project').text(project.name);

			// Reset the UI
			validationManager.reset(_('subscribe-definition'));
			_('subscribe-parameters-container').empty();
			_('subscription-set-parameters').attr('disabled', 'disabled');
			_('subscribe-definition').removeClass('hide').find('li,.choice').removeClass('active').end().find(':checked').removeAttr('checked');

			// Show first tab
			_('subscribe-definition').find('.nav-pills li').first().find('a').tab('show');
		},

		availableNextStep: function () {
			_('subscription-next').removeClass('hide');
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
					current.renderChoices('service', 'node/children', true, current.availableNextStep);
					break;
				case 1:
					// Show tools
					current.renderChoices('tool', 'node/' + _('subscribe-service').find('input:checked').val() + '/children/link', true, current.availableNextStep);
					break;
				case 2:
					// Show nodes
					current.renderChoices('node', 'node/' + _('subscribe-tool').find('input:checked').val() + '/children/link', true, current.availableNextStep);
					break;
				case 3:
					// Show modes
					current.renderChoicesData('mode', [
						current.newMode('create', 'plus'),
						current.newMode('link', 'link')
					]);
					current.availableNextStep();
					break;
				case 4:
					// Show parameters
					current.parameterConfiguration = null;
					current.renderChoices('parameters', 'node/' + current.getSelectedNode() + '/parameter/' + (current.isSubscriptionCreateMode() ? 'CREATE' : 'LINK'), false, function (data) {
						current.configureSubscriptionParameters(current.getSelectedNode(), data, function (configuration) {
							// Configuration and validators are available
							current.parameterConfiguration = configuration;
							_('subscription-create').removeClass('hide').trigger('focus');
						});
					});
					break;
				case 5 :
					// Create the subscription with provided parameters
					current.parameterConfiguration && current.createSubscription(current.parameterConfiguration);
					break;
				default :
		}
	},

	/**
	 * Render choices
	 */
	renderChoices: function (type, url, renderData, callback) {
		var $container = _('subscribe-' + type).find('.choices');
		var $description = $container.closest('.tab-pane').find('.choice-description');
		$container.html('<i class="loader fa fa-spin fa-refresh fa-5"></i>');
		$description.addClass('hide').empty();
		$.ajax({
			dataType: 'json',
			url: REST_PATH + url,
			type: 'GET',
			success: function (nodes) {
				$container.empty();
				$description.addClass('hide').empty();
				renderData && current.renderChoicesData(type, nodes);
				(!renderData || nodes.length) && callback && callback(nodes);
			}
		});
	},

	renderChoicesData: function (type, nodes) {
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
				icon = current.$parent.getToolFromId(node.id) ? current.$parent.toIcon(node, 'x64w') : '<i class="fa fa-cloud"></i>';
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
			$description.addClass('hide').empty();
			node.description && $description.html(node.description).removeClass('hide');
			if (current.$parent.getToolFromId(node.id)) {
				// Use provided image for 'img' node
				$name.html(current.$parent.toIconNameTool(node));
			} else {
				// Use classes of 'i' node
				$name.html('<span><i class="' + (node.uiClasses || 'fa fa-cloud') + '"></i></span><span>' + current.$main.getNodeName(node) + '</span>');
			}
		});
		if (type === 'mode') {
			_('subscribe-mode').find('label.choice.hide').removeClass('hide');
			_('subscribe-mode').filter('.mode-link').find('label.choice input[value="create"]').closest('label').addClass('hide');
		} else {
			_('subscribe-mode').removeClass('mode-create').removeClass('mode-link');
		}
		if ($inputs.closest('.choice:not(.hide)').first().find('input[data-index]').prop('checked', 'checked').trigger('change').closest('.choice').addClass('active').focus()) {
			_('subscription-next').removeAttr('disabled');
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
			project: current.currentId,
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
			current.newNodeSelect2($input, restUrl, current.$parent.toName, function (e) {
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
		current.$parent.requireTool(current, node, function ($tool) {
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

				// Refresh the project, invalidate the model
				var project = current.currentId;
				current.currentId = null;

				// Show the subscription
				window.location.replace(current.$url + '/' + project);
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
	 * Load a configuration from the subscription identifier.
	 */
	loadSubscriptionConfiguration: function (id) {
		_('subscribe-definition').addClass('hide');
		_('details').addClass('hide');
		_('main').addClass('hide');
		$.ajax({
			dataType: 'json',
			url: REST_PATH + 'subscription/' + id + '/configuration',
			type: 'GET',
			success: function (data) {
				var service = current.$parent.getServiceFromNode(data.node);
				current.$parent.requireService(current, service.id, function ($service) {
					// Destroy the previous view, some cache could be performed there ...
					current.$view.find('.subscribe-configuration').remove();
					// Inject the partial of this service in the current view
					var $subscribe = ($service.$view.is('.subscribe-configuration') ? $service.$view : $service.$view.find('.subscribe-configuration')).clone();
					current.$view.append($subscribe);
					if ($service && $service.configure) {
						// Delegate the configuration to the service
						$service.configure(data);

						// Inject the project name
					} else {
						// Not managed configuration for this service
						traceLog('No managed configuration for service ' + service.id);
					}

					// Show the souscription specific configuration view
					$subscribe.removeClass('hide hidden').find('.project-name').text(current.model.name);
				});
			}
		});
	},

	/**
	 * Remove a subscription, optionally with deletion of remote data.
	 */
	unsubscribe: function (id, name, withDeletion) {
		if ((typeof id) === 'number') {
			// Delete without confirmation
			$.ajax({
				type: 'DELETE',
				url: REST_PATH + 'subscription/' + id + '/' + (withDeletion ? 'true' : 'false'),
				success: function () {
					// Refresh the table without additional query
					current.subscriptions.fnDeleteRow(_('subscriptions').find('tr[data-id="' + id + '"]')[0]);
					notifyManager.notify(Handlebars.compile(current.$messages.deleted)(name));
				}
			});
		} else {
			// Requires a confirmation for the selected subscription row
			var subscription = current.subscriptions.fnGetData($(this).closest('tr')[0]);
			var displayName = subscription.node.name + '[' + subscription.id + ']';
			withDeletion = $(this).hasClass('delete');
			bootbox.confirmDelete(function (confirmed) {
				confirmed && current.unsubscribe(subscription.id, displayName, withDeletion);
			}, displayName, '<br><br>' + current.$messages[withDeletion ? 'confirm-delete-subscription' : 'confirm-unsubscribe']);
		}
	}
};
return current;
});
