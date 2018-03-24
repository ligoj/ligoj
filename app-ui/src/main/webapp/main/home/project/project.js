/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
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
		 * Edited project's identifier
		 */
		currentId: 0,

		/**
		 * Edited subscription model
		 */
		currentSubscription: null,

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
					current.loadProject(id, function(model, refresh) {
						if (!refresh && current.currentSubscription) {
							_('subscriptions').find('tr[data-id="' + current.currentSubscription.id + '"]').find('td.key').html('<i class="fas spin fa-spinner fa-pulse"></i>');
							current.$parent.refreshSubscription(current.currentSubscription);
						}
						current.currentSubscription = null;
					});
				} else if (parameters.length === 2) {
					// Subscription creation mode
					current.currentSubscription = null;
					current.loadProject(id, current.newSubscription);
				} else {
					// Subscription configuration mode
					current.loadProject(id, function () {
						current.loadSubscriptionConfiguration(parseInt(parameters[2], 10), function(subscription) {
							current.currentSubscription = subscription;
						});
					});
				}
			} else {
				// Search mode
				current.currentSubscription = null;
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
			_('details').addClass('hidden');
			$('.subscribe-configuration').addClass('hidden');
			_('main').removeClass('hidden');
			$(function () {
				_('entityTable_filter').find('input').trigger('focus');
			});
		},

		/**
		 * Project mode, load project where id = current.currentId.
		 * @param {integer} id Project identifier to load.
		 * @param {function} Optional callback called when the project is loaded. 
		 * Passed arguments are : project's model, and a true boolean when the project has been refreshed. 
		 */
		loadProject: function (id, callback) {
			// Restore QR Code position
			$('.qrcode-toggle').find('.fa-qrcode').removeClass('hidden').end().find('.qrcode').addClass('hidden');

			$('.subscribe-configuration').addClass('hidden');
			_('main').addClass('hidden');
			_('details').addClass('hidden');

			$cascade.appendSpin(current.$view, 'fa-4x', 'far fa-circle faa-burst animated centered');
			if (id === current.currentId) {
				// Project is already loaded, cache useless Ajax call, display the details
				_('details').removeClass('hidden');
				callback && callback(current.model, false);
				$cascade.removeSpin(current.$view);
			} else {
				$.ajax({
					dataType: 'json',
					url: REST_PATH + 'project/' + id,
					type: 'GET',
					success: function (project) {
						current.model = project;
						current.fillProject(project);
						_('details').removeClass('hidden');
						callback && callback(project, true);
						$cascade.removeSpin(current.$view);
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
				_('pkey').disable(uc.nbSubscriptions > 0).select2('val', uc.pkey || '');
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
							data.results.push({
								id: pkeys[0],
								text: pkeys[0]
							});
						}
					}
					if (_('name').val()) {
						pkeys = current.generatePKeys(_('name').val());
						for (index = 0; index < pkeys.length; index++) {
							data.results.push({
								id: pkeys[index],
								text: pkeys[index]
							});
						}
					}
					query.callback(data);
				}
			});
			current.$main.newSelect2User('#teamLeader');

			// Also initialize the datatables of all projects
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
				columns: [{
					data: 'name',
					width: '200px',
					className: 'truncate',
					render: function (_i, mode, data) {
						if (mode === 'display') {
							return '<a href="' + current.$url + '/' + data.id + '">' + data.name + '</a>';
						}
						return data.name;
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
						var editlink = '<a class="update" data-toggle="modal" data-target="#popup"><i class="fas fa-pencil-alt" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a>';
						return editlink + '<a class="delete"><i class="fas fa-timesfas fa-times" data-toggle="tooltip" title="' + current.$messages['delete'] + '"></i></a>';
					}
				}],
				buttons: securityManager.isAllowedBusiness('project', 'post,put') ? [{
					extend: 'popup',
					className: 'btn-success btn-raised'
				}] : []
			});
		},

		uiToModel: function () {
			return {
				id: current.currentId,
				name: _('name').val(),
				pkey: _('pkey').val(),
				teamLeader: _('teamLeader').val(),
				description: _('description').val()
			};
		},

		save: function () {
			_('confirmCreate').button('loading');
			var data = current.uiToModel();
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'project',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (id) {
					notifyManager.notify(Handlebars.compile(current.$messages[current.currentId ? 'updated' : 'created'])(data.name + ' (' + (data.id || id) + ')'));
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
		initializeDetails: function () {
			if (current.form) {
				return;
			}
			current.form = true;
			_('cancel').click(current.cancel);
			_('save').click(current.save);
			_('subscriptions').on('click', '.group.group-start.row-group-collapsed', function() {
				current.expandGroup($(this));
			});
			_('subscriptions').on('click', '.group.group-start:not(.row-group-collapsed)', function() {
				current.collapseGroup($(this));
			});

			$cascade.trigger('html', _('details'));
		},

		fillProject: function (project) {
			current.initializeDetails();
			current.currentId = project ? project.id : 0;
			var name = project ? project.name + ' (' + project.pkey + ')' : '';
			$('.project-name').text(name);
			$('.cascade-title').text(current.$messages.title + (project ? ' / ' + project.name : ''));

			if (project.description) {
				_('detail-description').html(project.description).removeClass('hidden');
			} else {
				_('detail-description').addClass('hidden');
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

		/**
		 * Fill the datatables of subscription, no AJAX, already loaded with the project's detail.
		 */
		fillSubscriptionsTable: function (project, $nodes) {
			require(['datatables/dataTables.rowGroup'], function() {
				current.fillSubscriptionsTableInternal(project, $nodes);
			});
		},
		
		/**
		 * Data source column number.
		 */
		dataSrcToNumCol : {'node.refined.refined.id' : 1,'node.refined.id' : 2,'node.id' : 3, 'compact' : 4},
		
		/**
		 * Registered data source for grouping.
		 */
		dataSrcs : ['node.id', 'node.refined.id', 'node.refined.refined.id'],
		
		/**
		 * Return the data corresponding to the given depth starting from a node.
		 * @param {object} node The subscription node.
		 * @param {integer} depth The positive depth to follow within the node's redefinition.
		 * @return The node data in the given depth.
		 */
		dataSrcGetter : function(node, depth) {
			if (depth === 0) {
				return node.id;
			}
			return current.dataSrcGetter(node.refined, depth - 1);
		}, 
		
		/**
		 * Group the subscriptions table by the given data path (dataSrc).
		 * @param {string} dataSrc Optional data source. When null, disable group mode.
		 */
		groupBy: function(dataSrc) {
			// Show collapsed groups
			_('subscriptions').find('tr.hidden[data-subscription]').removeClass('hidden');

			if (dataSrc) {
				var masterDataSrc = dataSrc;
				if (dataSrc.startsWith('compact-')) {
					masterDataSrc = 'compact';
				}
				current.subscriptions.DataTable().order([[ current.dataSrcToNumCol[masterDataSrc], 'asc' ]]);
				current.subscriptions.DataTable().rowGroup().dataSrc(dataSrc).enable();
				current.subscriptions.DataTable().draw();
				current.subscriptions.addClass('grouped');
				
				// For auto group, collaspe the big groups
				var size = current.model.subscriptions.length;
				if (size > 20) {
					var $groups = _('subscriptions').find('tbody>tr.group-start');
					var sizes = {};
					var groups = [];
					$groups.each(function() {
						var group = $(this).attr('data-group');
						groups.push(group);
						sizes[group] = $(this).nextUntil('.group-start').length;
					});
					cursor = size;
					while (size > 20 && cursor > 2) {
						for (var index = groups.length; index-- > 0;) {
							group = groups[index];
							if (sizes[group] === cursor) {
								// Reduce the remaining size
								size -= cursor;
								current.collapseGroup($groups.filter('[data-group="' + group +'"]'));
							}
						}
						cursor--;
					}
				}
			} else {
				// No more group
				current.subscriptions.DataTable().rowGroup().disable();
				current.subscriptions.removeClass('grouped');
				current.subscriptions.DataTable().draw();
			}
		},
		
		/**
		 * Remove groups where there is only one subscription.
		 */
		pruneUselessGroups: function(groups) {
			var total = 0;
			for (var id in groups) {
				var count = groups[id];
				if (count === 1) {
					delete groups[id];
				} else {
					total += count;
				}
			}
			return total;
		},

		getAutoGroupDataSrc: function() {
			var subscriptions = current.model.subscriptions;
			var modes = [];
			var nodeId;
			var depth;
			var mode;
			for (depth = 0; depth < current.dataSrcs.length; depth++) {
				mode = {ids:{}, depth: depth};
				modes.push(mode);
				for (var i = 0; i< subscriptions.length; i++) {
					nodeId = current.dataSrcGetter(subscriptions[i].node, depth);
					mode.ids[nodeId] = (mode.ids[nodeId] || 0) + 1;
				}
				// Remove groups where there is only one subscription
				mode.nbGrouped = current.pruneUselessGroups(mode.ids);

				// Count relevant groups of subscriptions
				mode.nbGroups = Object.keys(mode.ids).length;
			}
			var maxDepth = null;
			var maxGrouped = 0;
			var maxGroups = 0;
			var maxMode = null;
			for (depth = 0; depth < current.dataSrcs.length; depth++) {
				mode = modes[depth];
				if (mode.nbGroups > maxGroups || mode.nbGroups === maxGroups && mode.nbGrouped > maxGrouped) {
					maxGroups = mode.nbGroups;
					maxGrouped = mode.nbGrouped;
					maxMode = mode;
					maxDepth = current.dataSrcs[depth];
				}
			}
			if (maxGroups === 1 && maxGrouped === subscriptions.length) {
				// One group means no needed group
				maxDepth = null;
			}
			
			// Check compact mode utility
			if (maxDepth !== null && (subscriptions.length - mode.nbGrouped) > 1) {
				// More than 1 subscription is not within a group, create a special compact group
				maxDepth = 'compact-' + maxDepth.replace(/\./g, '__');
				for (var j = 0; j< subscriptions.length; j++) {
					nodeId = current.dataSrcGetter(subscriptions[j].node, maxMode.depth);
					subscriptions[j][maxDepth] = maxMode.ids[nodeId] ? nodeId : 'z_orphan_';
					subscriptions[j].compact = subscriptions[j][maxDepth];
				}
			}
			return maxDepth;
		},

		fillSubscriptionsTableInternal: function (project, $nodes) {
			var buttons = project.manageSubscriptions ? [{
					extend: 'create',
					text: current.$messages.subscribe,
					init: function (_i, $button) {
						$button.off('click.dtb').attr('href', current.$url + '/' + current.currentId + '/subscription');
					}
				}] : [];
			buttons.push({
				extend: 'collection',
				text: '<i class="far fa-object-group"></i>',
				fade: 0,
				attr: {
					'title': current.$messages['group-by'],
					'data-toggle': 'tooltip'
				},
				autoClose : true,
				buttons: [{
					text: '<i class="fas fa-magic fa-fw"></i> ' + current.$messages['group-by-auto'],
					action: function () {
						current.groupBy(current.getAutoGroupDataSrc());
					}
				}, {
					text: '<i class="fas fa-ban fa-fw"></i> ' + current.$messages['group-by-none'],
					action: function () {
						current.groupBy();
					}
				}, {
					text: '<i class="fas fas fa-glass-martini fa-fw"></i> ' + current.$messages.service,
					action: function () {
						current.groupBy('node.refined.refined.id', 1);
					}
				}, {
					text: '<i class="fas fa-wrench fa-fw"></i> ' + current.$messages.tool,
					action: function () {
						current.groupBy('node.refined.id', 2);
					}
				}, {
					text: '<i class="fas fa-cube fa-fw"></i> ' + current.$messages.node,
					action: function () {
						current.groupBy('node.id', 3);
					}
				}]
			});
			var groupBy = current.getAutoGroupDataSrc();
			current.subscriptions = _('subscriptions').dataTable({
				dom: '<"row"<"col-xs-6"B>>t',
				pageLength: -1,
				destroy: true,
				order: [
					[2, 'asc']
				],
				data: project.subscriptions,
				createdRow: function (nRow, subscription) {
					$(nRow).addClass(subscription.node.id.replace(/:/g, '-')).addClass(subscription.node.refined.id.replace(/:/g, '-')).addClass(subscription.node.refined.refined.id.replace(/:/g, '-')).attr('data-subscription', subscription.id).attr('data-id', subscription.id).find('.unsubscribe, .delete').on('click', current.unsubscribe);
					current.$parent.applySubscriptionStyle($(nRow), subscription, false);
				},
				columns: [{
					data: 'null',
					className: 'status',
					orderable: false,
					render: function () {
						return '<div class="draw status-content"></div>';
					}
				}, {
					data: 'node.refined.refined.id',
					className: 'hidden-xs service',
					render: function (_i, mode, subscription) {
						if (mode === 'display') {
							return current.$parent.toIcon(subscription.node.refined.refined);
						}
						return subscription.node.refined.refined.name;
					}
				}, {
					data: 'node.refined.id',
					className: 'responsive-tool icon-xs tool truncate',
					render: function (_i, mode, subscription) {
						if (mode === 'display') {
							return current.$parent.toIconNameTool(subscription.node.refined);
						}
						return subscription.node.refined.name;
					}
				}, {
					data: 'node.id',
					className: 'hidden-xs responsive-node truncate',
					render: function (_i, _m, subscription) {
						return subscription.node.name;
					}
				}, {
					data: 'compact',
					className: 'hidden'
				}, {
					data: null,
					orderable: false,
					className: 'truncate key rendered',
					render: function (_i, _j, subscription) {
						return current.$parent.render(subscription, 'renderKey', $nodes[subscription.node.id]);
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
							return '<a class="unsubscribe"><i class="fas fa-times" data-toggle="tooltip" title="' + current.$messages.unsubscribe + '"></i></a>' + ((subscription.node.refined.mode === 'create' || subscription.node.mode === 'create') ? '<a class="delete"><i class="fas fa-trash-alt" data-toggle="tooltip" title="' + current.$messages['delete-subscription'] + '"></i></a>' : '');
						}
						return '&nbsp';
					}
				}],
				buttons: buttons,
				rowGroup: {
					dataSrc: groupBy || "project",
					startRender: function (rows, group) {
						var dataSrc = rows.table().rowGroup().dataSrc();
						var $tr = $('<tr/>').attr('data-group', group);
						var subscription = rows.data()[0];
						
						// Add common subscription status
						$tr.append('<td/>');
						
						// Orphan group detection
						if (group === 'z_orphan_') {
							// Orphan group case
							dataSrc = group;
						} else if (dataSrc && dataSrc.startsWith('compact-')) {
							// Not the orphan group
							dataSrc = dataSrc.substring('compact-'.length).replace(/__/g, '.');
						}

						// Add service/too/node TD
						if (dataSrc === 'node.id') {
							// Node mode
							$tr.append('<td>' + current.$parent.toIcon(subscription.node.refined.refined) +'</td>');
							$tr.append('<td>' + current.$parent.toIconNameTool(subscription.node.refined) +'</td>');
							$tr.append('<td colspan="4">' + subscription.node.name +'</td>');
						} else if (dataSrc === 'node.refined.id' || dataSrc === 'node.id') {
							// Tool mode
							$tr.append('<td>' + current.$parent.toIcon(subscription.node.refined.refined) +'</td>');
							$tr.append('<td colspan="5">' + current.$parent.toIconNameTool(subscription.node.refined) +'</td>');
						} else if (dataSrc === 'node.refined.refined.id') {
							// Service mode
							$tr.append('<td colspan="6">' + current.$parent.toIcon(subscription.node.refined.refined) + '&nbsp;' + subscription.node.refined.refined.name + '</td>');
						} else {
							// Orphan group
							$tr.append('<td colspan="6">'+ current.$messages['group-by-other'] +'</td>');
						}
						$tr.children().eq(0).append('<div class="grouped-count label label-default"><span class="toggle"><i class="far fa-plus-square"></i><i class="far fa-minus-square"></i></span>' + rows.count() + '</div>');
						return $tr;
					}
				}
			});
			current.groupBy(groupBy);

			// Launch Ajax requests to refresh statuses just after the table has been rendered
			for (var index = 0; index < project.subscriptions.length; index++) {
				current.$parent.refreshSubscription(project.subscriptions[index]);
			}

			// Remove the spin
			$cascade.removeSpin(current.$view);
		},

		/**
		 * Apply the given function to all subscriptions based on a node equals or inside the given row group.
		 * @param {jquery} $tr The related row group.
		 * @param {function} f The function to apply.
		 */
		applyFunctionGroup: function($tr, f) {
			var id = $tr.attr('data-group');
			$tr.nextUntil('.group-start')[f]('hidden');
			$tr[f]('row-group-collapsed');
			var subscriptions = current.model.subscriptions;
			var $subscriptions = _('subscriptions');
			for (var i = 0; i< subscriptions.length; i++) {
				var subscription = current.model.subscriptions[i];
				if (subscription.node.id === id || subscription.node.id.startsWith(id + ':')) {
					// Hide the related row
					$subscriptions.find('tr[data-subscription="' + subscription.id + '"]')[f]('hidden');
				}
			}
		},

		/**
		 * Collapse the given group. All subscriptions based on a node equals or inside the given row group are hidden.
		 * @param {jquery} $tr The related row group.
		 */
		collapseGroup: function($tr) {
			current.applyFunctionGroup($tr, 'addClass');
		},

		/**
		 * Expand the given group. All subscriptions based on a node equals or inside the given row group are shown.
		 * @param {jquery} $tr The related row group.
		 */
		expandGroup: function($tr) {
			current.applyFunctionGroup($tr, 'removeClass');
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

			$cascade.loadFragment(current, current.$transaction, 'main/home/project/subscribe-wizard', 'subscribe-wizard', {
				callback: function(context) {
					context.setModel(project);
				},
				plugins: ['css', 'i18n', 'html', 'js']
			});

			$(document).off('subscribe:saved').on('subscribe:saved', '#subscribe-definition', function() {
				// Show the subscription
				current.currentId = project;
				window.location.replace(current.$url + '/' + project.id);
			});
		},

		/**
		 * Load a configuration from the subscription identifier.
		 */
		loadSubscriptionConfiguration: function (id, callback) {
			_('subscribe-definition').addClass('hidden');
			_('details').addClass('hidden');
			_('main').addClass('hidden');
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'subscription/' + id + '/configuration',
				type: 'GET',
				success: function (data) {
					data.id = parseInt(id, 10);
					var service = current.$parent.getService(data.node);
					current.$parent.requireService(current, service.id, function ($service) {
						current.configurePluginView($service, service, data, callback);
					});
				}
			});
		},

		configurePluginView: function($context, service, data, callback) {
			var tool = current.$parent.getTool(data.node);
			// Destroy the previous view, some cache could be performed there ...
			current.$view.find('.subscribe-configuration').not('#subscribe-definition').remove();
			// Inject the partial of this service in the current view
			var $subscribe = ($context.$view.is('.subscribe-configuration') ? $context.$view : $context.$view.find('.subscribe-configuration')).clone();
			var $subscribeWrapper = $('<div id="configuration-wrapper-' + data.id + '" class="configuration-wrapper-' + service.id.replace(/:/g, '-') + ' configuration-wrapper-' + tool.id.replace(/:/g, '-') +'"></div>');
			current.$view.append($subscribeWrapper);
			$subscribeWrapper.html($subscribe);
			if ($context && $context.configure) {
				// Delegate the configuration to the service
				$context.configure(data);
				callback && callback(data);

				// Inject the project name
			} else {
				// Not managed configuration for this service
				traceLog('No managed configuration for service ' + service.id);
			}

			// Show the subscription specific configuration view
			$subscribe.removeClass('hidden').removeClass('hide').find('.project-name').text(current.model.name);
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
