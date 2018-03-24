/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'jquery', 'cascade'
], function ($, $cascade) {
	var current = {
		/**
		 * Subscriptions with projects and nodes
		 */
		model: null,
		gridClasses: [
			'col-lg-2 col-md-3 col-sm-4 col-xs-6 mode-th', 'col-lg-3 col-md-4 col-sm-6 col-xs-12 mode-th-large', 'col-lg-12 col-md-12 col-sm-12 col-xs-12 mode-th-list'
		],
		gridClass: null,
		initialize: function () {
			var $container = $('.masonry-container');
			current.gridClass = current.gridClasses[1];

			// Status management
			this.loadStatus();
			_('refreshSubBtn').click(this.refreshSubStatus);
			_('status').on('click', 'tr .refresh-node', this.refreshNodeStatus);
			_('redirection').val(current.$session.userSettings['preferred-url'] || '');
			_('redirection-tools').find('.radio').on('click', this.dirty);
			_('redirection').on('change', this.dirty);
			_('save-redirect').on('click', this.saveRedirect);
			this.consolidate();

			// Project/Subscription mode
			_('grid-mode').on('change', 'input[type="radio"]', function (e) {
				var mode = $(e.target).closest('label').index();
				$('.masonry-container').children('.node').removeClass(current.gridClasses.join(' ')).addClass(current.gridClasses[mode]);
				current.masonry();
				current.checkVisibleSubscriptionsAsync();
			});

			// Filter tags
			_('tag-mode').on('change', 'input[type="checkbox"]', function () {
				current.filterNodes();
			});
			$container.on('click', '.tag', function (e) {
				_('tag-mode').find('.btn').removeClass('active').find('input[type="checkbox"]').prop('checked', false).filter('[name="' + $(e.target).closest('.tag').attr('data-id') + '"]').prop('checked', true).closest('.btn').addClass('active');
				current.filterNodes();
			}).on('mouseenter', '.zoomable', function (e) {
				current.zoomProjectIn($(e.target));
			}).on('mouseleave', '.zoomable', function (e) {
				current.zoomProjectOut($(e.target));
			}).on('click', '.group-carousel .carousel-indicators>li', function (e) {
				var $indicator = $(e.target);
				$indicator.closest('.carousel-indicators').find('.active').removeClass('active');
				$indicator.addClass('active').closest('.node').find('.carousel').carousel(parseInt($indicator.attr('data-slide-to'), 10));
			}).on('mouseenter', '.node', function (e) {
				var $node = $(e.target).closest('.node');
				if (!$node.is('.in')) {
					current.zoomIn($node);
				}
			}).on('mouseleave', '.node', function (e) {
				var $node = $(e.target).closest('.node');
				if ($node.is('.in') && $node.has('.caption i.fa.forced').length === 0) {
					current.zoomOut($node);
				}
			}).on('click', '.caption', function (e) {
				$(e.target).closest('.node').find('.caption i.fa').toggleClass('forced');
			});

			// Full screen mode
			_('fullscreen').on('click', function () {
				$.fn.fullscreen();

				// Make sure the new visible items are loaded
				current.checkVisibleSubscriptions();
			});
			_('exit-fullscreen').on('click', $.fn.exitFullscreen);

			// Detect visible subscriptions, and load the fresh status
			document.addEventListener('scroll', current.onScroll, true);

			// Focus to the filter and register filter on change
			_('search').on('keyup', function (e) {
				if ((String.fromCharCode(e.keyCode).match(/\w/) || e.keyCode === 8 || e.keyCode === 46) && current.model) {
					current.filterNodes();
				}
			}).focus();

			// Load all visible subscriptions
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'subscription',
				type: 'GET',
				success: current.fillSubscriptions
			});
		},

		/**
		 *
		 * On "scroll" event handler.
		 */
		onScroll: function (event) {
			var $target = $(event.target);
			if (event.target === document || $target.is('.masonry-container .details') || $target.is('.masonry-container .scrollbar-macosx')) {
				current.checkVisibleSubscriptions($target);
			}
		},

		unload: function () {
			// Cleanup out of scope listeners
			document.removeEventListener('scroll', current.onScroll);
		},

		isElementInViewport: function (el) {
			el = $(this)[0];
			var top = el.getBoundingClientRect().top;
			var rect;
			el = el.parentNode;
			do {
				rect = el.getBoundingClientRect();
				if (top > rect.bottom) {
					return false;
				}
				el = el.parentNode;
			} while (el !== document.body);
			// Check its within the document viewport
			return top <= document.documentElement.clientHeight;
		},

		/**
		 * Check the subscriptions newly visible.
		 */
		checkVisibleSubscriptions: function ($context) {
			var newVisibleSubscriptions = [];
			$context = $context || $('.masonry-container').children('.node.in');
			$context.find('.trigger-visibility:visible').not('.refreshing').filter(current.isElementInViewport).addClass('.refreshing').each(function () {
				var $owner = $(this);
				newVisibleSubscriptions.push(current.model.subscriptions[parseInt($owner.removeClass('trigger-visibility').attr('data-subscription'), 10)]);
				$owner.find('.features').html('<i class="fas spin fa-spinner fa-pulse"></i>');
			});
			newVisibleSubscriptions.length && current.refreshSubcriptionStatus(newVisibleSubscriptions);
		},

		/**
		 * Refresh the status of given subscription objects.
		 */
		refreshSubcriptionStatus: function (subscriptions) {
			var renderCallback = function (subscription, filter, $tool, $target) {
				var $td = $target.closest('td').addClass('detailed');
				if (filter === 'features') {
					current.$parent.render(subscription, 'renderFeatures', $tool);
				} else if (filter === 'key') {
					$td.closest('tr').addClass('detailed');
					current.zoomProjectIn($td);
				}
			};

			// One request per subscription
			current.$parent.refreshSubscription(subscriptions, renderCallback);
		},

		zoomProjectIn: function ($target) {
			var index = $target.closest('td,th').index();
			$target.closest('table').find('thead>tr>th.zoomable, tbody>tr>td.zoomable').each(function () {
				if ($(this).index() === index) {
					$(this).addClass('in');
				} else {
					$(this).removeClass('in');
				}
			});
		},
		zoomProjectOut: function ($target) {
			$target.closest('table').find('thead>tr>th.zoomable, tbody>tr>td.zoomable').removeClass('in').filter('.zoomable-default').addClass('in');
		},

		/**
		 * Zoom in a node
		 */
		zoomIn: function ($node) {
			var $img = $node.find('.thumbnail>.main>img');
			var model = current.model;
			var node = model.nodes[$node.attr('data-id')];
			$img.attr('src', $img.attr('data-src').slice(0, -5) + '.png');
			$node.addClass('in');
			$node.find('.caption i').addClass('fa-caret-down').removeClass('fa-caret-right');
			if (node.detailed === undefined) {
				// Details need to be loaded
				current.loadDetails(node, $node);
			} else {
				// Update the pack
				current.masonry();

				// Complete the expanded UI elements
				current.checkVisibleSubscriptionsAsync();
			}
		},

		/**
		 * Check the visible items asynchronously.
		 * @param $context Optional context to reduce the checked elements.
		 */
		checkVisibleSubscriptionsAsync: function ($context) {
			window.setTimeout(function () {
				current.checkVisibleSubscriptions($context);
			}, 100);
		},

		/**
		 * Pack the nodes.
		 */
		masonry: function (options) {
			$.fn.masonry && $('.masonry-container').masonry(options);
		},

		/**
		 * Zoom out a node
		 */
		zoomOut: function ($node) {
			var $img = $node.find('.thumbnail>.main>img');
			$img.attr('src', $img.attr('data-src'));
			$node.removeClass('in');
			$node.find('.caption i').addClass('fa-caret-right').removeClass('fa-caret-down');
			$node.find('.open [data-toggle="dropdown"]').closeDropdown();
			current.masonry();
		},

		/**
		 * Load details of given node.
		 */
		loadDetails: function (node, $node) {
			$node = $node || $('.masonry-container').find('.node[data-id="' + node.id + '"]');
			var index;
			var project;
			var subscription;
			var model = current.model;
			var subscriptions = model.subscriptions;
			var nodeSubscriptions = node.subscriptions;
			var projects = model.projects;
			var $thumbnail = $node.find('.thumbnail');
			var $tr;
			var tableContent;
			var $tbody;

			// Remove old data (refresh)
			$thumbnail.children('.details').remove();
			tableContent = '<div class="details group-carousel"><div class="scrollbar-macosx"><table class="subscriptions table dataTable justified"><thead><tr>';

			// Status
			tableContent += '<th class="status"><i class="fas fa-power-off" data-toggle="tooltip" title="' + current.$messages['status-subscription'] + '"></i></th>';

			// Project
			tableContent += '<th class="project zoomable"><i class="fas fa-folder-open" data-toggle="tooltip" title="' + current.$messages.project + '" data-container="#_ucDiv"></i></th>';

			// Subscription
			tableContent += '<th class="key zoomable zoomable-default in"><i class="fas fa-plug" data-toggle="tooltip" title="' + current.$messages.subscription + '" data-container="#_ucDiv"></i></th>';

			// Features
			tableContent += '<th class="features"><i class="fas fa-cogs" data-toggle="tooltip" title="' + current.$messages.features + '" data-container="#_ucDiv"></i></th></tr></thead><tbody></tbody></table></div></div>';
			$thumbnail.append(tableContent);
			$tbody = $thumbnail.find('.subscriptions tbody');
			for (index = 0; index < nodeSubscriptions.length; index++) {
				// Add a row for each subscription
				subscription = subscriptions[nodeSubscriptions[index]];
				project = projects[subscription.project];
				tableContent = '<tr class="trigger-visibility" data-subscription="' + subscription.id + '" data-project="' + project.id + '">';
				tableContent += '<td class="status"><div class="status-content"></div></td>';
				tableContent += '<td class="project zoomable"><a href="#/home/project/' + project.id + '" title="' + project.name + '" data-toggle="tooltip" data-container="#_ucDiv">' + project.name + '</a></td>';
				tableContent += '<td class="key zoomable zoomable-default in"></td>';
				tableContent += '<td class="features"></td></tr>';
				$tr = $(tableContent);
				$tbody.append($tr);
				current.$parent.applySubscriptionStyle($tr, subscription, false);
			}
			
			// Add custom scrollbar
			require(['jquery.scrollbar', 'css!main/home/home/scrollbar.css'], function() {
				jQuery($node.find('.scrollbar-macosx')).scrollbar({ignoreMobile: true});
				node.detailed = true;
				current.filterNodes($node);
			});

		},

		distinct: function (value, index, self) {
			return self.indexOf(value) === index;
		},

		/**
		 * Fill the subscriptions in the UI.
		 */
		fillSubscriptions: function (model) {
			current.model = model;

			// Clear previous nodes
			var index;
			var tags = [];
			var tagUiClasses = {};
			var projectsAsList = model.projects;
			var projects = {};
			var nodesAsList = model.nodes;
			var nodes = {};
			var node;
			var project;
			var subscriptionsAsList = model.subscriptions;
			var subscriptions = {};
			var subscription;

			// Make the model accessible by index and identifier
			model.nodesAsList = nodesAsList;
			model.nodes = nodes;
			model.projectsAsList = projectsAsList;
			model.projects = projects;
			model.subscriptionsAsList = subscriptionsAsList;
			model.subscriptions = subscriptions;

			// List to Map
			for (index = 0; index < nodesAsList.length; index++) {
				node = nodesAsList[index];
				nodes[node.id] = node;
				node.subscriptions = [];
				node.projects = {};
				node.nbProjects = 0;

				// Complete list of tags
				if (node.tag && tagUiClasses[node.tag] === undefined) {
					tags.push(node.tag);
					tagUiClasses[node.tag] = node.tagUiClasses || 'fas fa-tag';
				}
			}
			for (index = 0; index < projectsAsList.length; index++) {
				project = projectsAsList[index];
				projects[project.id] = project;
			}
			for (index = 0; index < subscriptionsAsList.length; index++) {
				subscription = subscriptionsAsList[index];
				node = nodes[subscription.node];
				subscription.node = node;
				subscriptions[subscription.id] = subscription;
				node.subscriptions.push(subscription.id);

				// Compute project counters
				if (!node.projects[subscription.project]) {
					node.projects[subscription.project] = true;
					node.nbProjects++;
				}
			}

			// Complete hierarchy
			for (index = 0; index < nodesAsList.length; index++) {
				node = nodesAsList[index];
				if (node.refined) {
					node.refined = nodes[node.refined];
				}
			}

			// PASS1 : Propagate the subscriptions/tags from leaves to roots : node to tool
			for (index = 0; index < nodesAsList.length; index++) {
				node = nodesAsList[index];
				if (node.refined && node.refined.refined) {
					// Is a leaf node
					node.refined.subscriptions = node.refined.subscriptions.concat(node.subscriptions).filter(current.distinct);
					node.refined.tag = node.refined.tag || node.refined.refined.tag;
					node.refined.nbProjects += node.nbProjects;
				}
			}
			// PASS 2: Propagate the subscriptions/tags from leaves to roots : tool to service
			for (index = 0; index < nodesAsList.length; index++) {
				node = nodesAsList[index];
				if (node.refined && node.refined.refined === undefined) {
					// Is a tool
					node.refined.subscriptions = node.refined.subscriptions.concat(node.subscriptions).filter(current.distinct);
					node.tag = node.tag || node.refined.tag;
				}
			}

			// Build the UI
			current.generateNodes(tags, tagUiClasses, nodesAsList);
		},

		/**
		 * Generate UI nodes.
		 */
		generateNodes: function (tags, tagUiClasses, nodesAsList) {
			// Build the tags UI
			var $tags = _('tag-mode').empty()[tags.length === 0 ? 'addClass' : 'removeClass']('hidden');
			var tag;
			var index;
			for (index = 0; index < tags.length; index++) {
				tag = tags[index];
				$tags.append('<label class="btn btn-raised" data-toggle="tooltip" title="' + current.$messages.filter + ' : ' + tag.capitalize() + '"><input type="checkbox" autocomplete="off" name="' + tag + '"><i class="' + tagUiClasses[tag] + '"></i> <span class="hidden-xs">' + tag.capitalize() + '</span> </label>');
			}

			// Build the masonry UI
			var nodeContent;
			var $container = $('.masonry-container');
			var node;

			// Build the UI thumbnails for each tool
			for (index = 0; index < nodesAsList.length; index++) {
				node = nodesAsList[index];
				// Consider only a tool
				if (node.refined && node.refined.refined === undefined) {
					// Wrapper
					var counters = current.toCounter(node.subscriptions.length, node.nbProjects);
					nodeContent = '<div class="node show ' + current.gridClass + ' ' + current.$parent.getHierarchyId(node.id) + '" data-id="' + node.id + '"><div class="thumbnail"><div class="main"><div class="counters"><span class="badge nb-total" data-toggle="tooltip" data-container="#_ucDiv"  title="' + current.$messages['node-subscriptions'] + '">' + counters + '</span><span class="badge nb-filtered hidden" data-toggle="tooltip" data-container="#_ucDiv" title="' + current.$messages['node-subscriptions-filtered'] + '"></span></div>' + current.$parent.toIcon(node, 'x64w', true) + '<div class="caption"><h3>' + node.name + ' <i class="fas fa-caret-right" data-toggle="tooltip" data-container="#_ucDiv" title="' + current.$messages['toggle-thumbnail'] + '"></i></h3></div>';

					// Tag
					tagUiClasses = node.tag && (node.tagUiClasses || (node.refined && (node.refined.tagUiClasses || (node.refined.refined && node.refined.tagUiClasses))));
					if (tagUiClasses) {
						nodeContent += '<div class="tag" data-id="' + node.tag + '"><i class="' + tagUiClasses + '" alt="' + node.tag + '" title="' + node.tag.capitalize() + '" data-toggle="tooltip" data-container="#_ucDiv"></i></div>';
					}
					nodeContent += '</div></div></div>';
					$container.append(nodeContent);
				}
			}
			current.updateUiNodeLimits();

			// Pack
			_('expand-mode').on('click', function () {
				var doExpand = $(this).toggleClass('indent').hasClass('indent');
				$container.find('.node').each(function () {
					current[doExpand ? 'zoomIn' : 'zoomOut']($(this));
				}).find('.caption').find('i.fa')[doExpand ? 'addClass' : 'removeClass']('forced');
			});
			if (!$cascade.isOldIE) {
				// Color modes
				_('color-mode').on('change', function () {
					var method = $(this).is(':checked') ? 'addClass' : 'removeClass';
					$container[method]('colored');
					$(this).closest('.btn').find('i')[method]('text-warning');
				});

				// Masonry
				require([
					'masonry', 'bootstrap-switch'
				], function (Masonry) {
					require(['jquery-bridget/jquery-bridget'], function (jQueryBridget) {
						jQueryBridget('masonry', Masonry, $);
						// Configure the grid
						$container.masonry({columnWidth: '.node.show', itemSelector: '.node.show'});
					});
				});
			}
		},

		/**
		 * Return the counter markup from a node.
		 * @param {number} nbSubscription Amount of subscriptions.
		 * @param {number} nbProjects Amount of projects.
		 * @return {string}     The counter markup : projets and subscription.
		 */
		toCounter: function (nbSubscription, nbProjects) {
			if (nbSubscription !== nbProjects) {
				return nbSubscription + ' <span class="counter-project" data-toggle="tooltip" title="' + current.$messages['node-projects'] + '">' + nbProjects + '</span>';
			}
			return nbSubscription;
		},

		/**
		 * Update UI for limits about node.
		 */
		updateUiNodeLimits: function () {
			var $container = $('.masonry-container');
			var $nodes = $container.children('.node');
			if ($nodes.length) {
				// No visible node -> display a notice about that
				_('no-match')[$container.has('.node.show').length ? 'addClass' : 'removeClass']('hidden');
				_('no-node').addClass('hidden');
				$('.with-node').removeClass('hidden');
			} else {
				// No enabled node -> display a notice about that
				_('no-node').removeClass('hidden');
				$('.with-node').addClass('hidden');
			}
		},

		// Filter nodes
		filterNodes: function ($context) {
			var $container = $('.masonry-container');
			var model = current.model;
			var nodes = model.nodes;
			var $nodes = $container.children('.node');

			// Hide/Show nodes by tag
			var enabledTags = [];
			var filter = _('search').val();
			filter = filter && new RegExp(filter, 'i');
			_('tag-mode').find('input:checked').each(function () {
				enabledTags.push($(this).attr('name'));
			});
			$nodes.addClass('hidden').removeClass('show').removeClass('filter-match').each(function () {
				var $node = $(this);
				var id = $node.attr('data-id');
				var node = nodes[id];
				if (enabledTags.length === 0 || (node.tag && enabledTags.indexOf(node.tag) !== -1)) {
					current.filterNode($node, model, node, filter, enabledTags);
				}
			});
			current.updateUiNodeLimits();

			// Pack with the new set of visible nodes
			current.masonry();

			// Asynchrone : check subscription visibility
			current.checkVisibleSubscriptionsAsync($context);
		},

		filterNode: function ($node, model, node, filter) {
			// Number of subscriptions matching the filter inside this node
			var showNode = false;
			var subscriptions = node.subscriptions;
			var counters = {};

			// Highlight the subscriptions
			if (filter) {
				// Node need to be filtered
				if (node.name.search(filter) > -1) {
					showNode = true;
					$node.addClass('filter-match');
				}
				counters = current.filterSubscriptions($node, model, node, filter);
				showNode = showNode || counters.subscriptions;
			} else {
				// No filter, show the node
				showNode = true;
				$node.find('tr').removeClass('filter-match hidden');
			}

			// Update the filter counters UI
			if (showNode && filter && counters.subscriptions) {
				// Add the filter counter in the caption of the tool and display only visible projects
				var countersText = '';
				if (subscriptions.length > 1 && subscriptions.length !== counters.subscriptions) {
					countersText += current.toCounter(counters.subscriptions, counters.projects);
				}
				$node.find('.nb-filtered').removeClass('hidden').html(countersText);
			} else {
				// Useless filter counter
				$node.find('.nb-filtered').addClass('hidden').empty();
				if (node.detailed && counters.subscriptions === 0) {
					// No subscriptions match, display all instead of keeping an empty table
					$node.find('tr').removeClass('filter-match hidden');
				}
			}

			if (showNode) {
				// Node can be displayed : tool matches or at least one project
				$node.removeClass('hidden').addClass('show');
			}
		},

		/**
		 *
		 * Filter the subscription items when they are not matching to the given filter
		 * @param  {jquery} $node         Filtered node UI JQuery.
		 * @param  {object} model         Data
		 * @param  {object} node          Filtered Node object
		 * @param  {string} filter        Filter string.
		 * @return {object}               Filtered subscriptions counter and corresponding projects counter.
		 */
		filterSubscriptions: function ($node, model, node, filter) {
			var nbSubscriptions = 0;
			var index;
			var projects = model.projects;
			var subscriptions = node.subscriptions;
			var projectsOnThisNode = {};
			var project;
			var nbProjects = 0;
			var showProject;
			// Subscriptions need to be filtered
			for (index = 0; index < subscriptions.length; index++) {
				project = projects[model.subscriptions[subscriptions[index]].project];
				showProject = false;
				if (project.id.toString() === filter || project.name.search(filter) > -1 || project.pkey.search(filter) > -1) {
					// Project is visible
					nbSubscriptions++;
					if (!projectsOnThisNode[project.id]) {
						projectsOnThisNode[project.id] = true;
						nbProjects++;
					}
					showProject = true;
				}

				// Update the UI as needed
				if (node.detailed) {
					// UI need to be updated for this project -> remove/add the filter flag
					$node.find('tr[data-project="' + project.id + '"]')[showProject ? 'addClass' : 'removeClass']('filter-match')[showProject ? 'removeClass' : 'addClass']('hidden');
				}
			}
			return {subscriptions: nbSubscriptions, projects: nbProjects};
		},

		/**
		 * load status
		 */
		loadStatus: function () {
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'node/status',
				type: 'GET',
				success: current.generateServicesStatusTable
			});
		},

		/**
		 * Generate services status table
		 */
		generateServicesStatusTable: function (servicesStatus) {
			var loopStatus = {
				serviceDisplayed: false,
				toolDisplayed: false
			};
			var nodes = [];
			var idxT;
			var service;
			_('status').find('tbody').empty();
			for (var id in servicesStatus) {
				if ({}.hasOwnProperty.call(servicesStatus, id)) {
					service = servicesStatus[id];
					loopStatus.serviceDisplayed = false;
					for (idxT = 0; idxT < service.specifics.length; idxT++) {
						current.generateToolStatusTable(nodes, loopStatus, service, service.specifics[idxT]);
					}
				}
			}
			current.loadPies(nodes);
		},

		/**
		 * Generate nodes status table
		 */
		generateToolStatusTable: function (nodes, loopStatus, service, tool) {
			var idxN;
			var nodeEvent;
			loopStatus.toolDisplayed = false;
			for (idxN = 0; idxN < tool.specifics.length; idxN++) {
				nodeEvent = tool.specifics[idxN];
				current.generateRow(loopStatus, service, tool, nodeEvent);
				nodes.push(nodeEvent.node);
			}
		},

		/**
		 * load pies
		 */
		loadPies: function (nodes) {
			// load statistics and higcharts
			require(['sparkline'], function () {
				$.ajax({
					dataType: 'json',
					url: REST_PATH + 'node/status/subscription',
					type: 'GET',
					success: function (data) {
						current.fillPies(data, nodes);
					}
				});
			});
		},

		fillPies: function (data, nodes) {
			var idx;
			var nodeEvent;
			var $node;
			var up;
			var down;
			var total;
			for (idx = 0; idx < data.length; idx++) {
				nodeEvent = data[idx];
				$node = _('status').find('[data-id="' + nodeEvent.node + '"]');
				if ($node.length) {
					up = nodeEvent.values.UP || 0;
					down = nodeEvent.values.DOWN || 0;
					total = nodeEvent.values.total;
					if ($node.data('status') === 'UP') {
						up = total - down;
					} else {
						down = total - up;
					}

					$node.sparkline([
						down, up
					], {
						type: 'pie',
						sliceColors: [
							'#d9534f', '#449d44'
						],
						offset: '-90',
						fillColor: 'black',
						tooltipFormatter: current._sparkPieTooltipFormatter
					});
					nodes.splice($.inArray(nodeEvent.node, nodes), 1);
				}
			}
			for (idx = 0; idx < nodes.length; idx++) {
				_('status').find('[data-id="' + nodes[idx] + '"]').sparkline([
					0, 0, 1
				], {
					type: 'pie',
					sliceColors: [
						'grey', 'grey', 'grey'
					],
					offset: '-90',
					tooltipFormatter: current._sparkPieTooltipFormatter
				});
			}
		},

		_sparkPieTooltipFormatter: function (sparkline, options, fields) {
			return Handlebars.compile(current.$messages['status-subscription-' + ['down', 'up', 'none'][fields.offset]])([
				fields.value,
				current.$parent.roundPercent(fields.percent)
			]);
		},
		/**
		 * Generate a row for a statu.
		 */
		generateRow: function (loopStatus, service, tool, nodeEvent) {
			var node = nodeEvent.node;
			var tr = '<tr>';
			if (!loopStatus.serviceDisplayed) {
				loopStatus.serviceDisplayed = true;
				tr += '<td rowspan="' + current.computeServiceRowSpan(service) + '" class="status status-' + service.value.toLowerCase() + '"><div class="status-content">&nbsp;</div></td>';
				tr += '<td rowspan="' + current.computeServiceRowSpan(service) + '">' + service.node.name + '</td>';
			}
			if (!loopStatus.toolDisplayed) {
				loopStatus.toolDisplayed = true;
				tr += '<td rowspan="' + tool.specifics.length + '" class="status status-' + tool.value.toLowerCase() + '"><div class="status-content">&nbsp;</div></td>';
				tr += '<td class="icon-xs" rowspan="' + tool.specifics.length + '">' + current.$parent.toIcon(tool.node) + '<span class="hidden-xs" title="' + tool.description + '"> ' + tool.node.name + '</span></td>';
			}
			tr += '<td class="status status-' + nodeEvent.value.toLowerCase() + '"><div class="status-content">&nbsp;</div></td>';
			tr += '<td>' + node.name + '<a class="refresh-node pull-right"><i class="fas fa-sync-alt"></i></a></td><td data-id="' + node.id + '"></td></tr>';
			_('status').find('tbody').append(tr);
			_('status').find('[data-id="' + node + '"]').data('status', nodeEvent.value);
		},

		/**
		 * compute service row span (number of nodes)
		 */
		computeServiceRowSpan: function (service) {
			var result = 0;
			var idxT;
			for (idxT = 0; idxT < service.specifics.length; idxT++) {
				result += service.specifics[idxT].specifics.length;
			}
			return result;
		},
		/**
		 * refresh node status
		 */
		refreshNodeStatus: function () {
			var $button = $(this);
			var id = $button.closest('tr').find('[data-id]').attr('data-id');
			$button = id ? $button : _('status').find('.refresh-node');
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'node/status/refresh' + (id ? '/' + id : ''),
				type: 'POST',
				success: function () {
					current.loadStatus();
					notifyManager.notify(current.$messages.statusRefreshed);
				},
				beforeSend: function () {
					_('status').find('tbody>tr').addClass('refresh');
					$button.disable().find('i').addClass('fa-spin');
				},
				complete: function () {
					_('status').find('tr.refresh').removeClass('refresh');
					$button.disable().find('i').removeClass('fa-spin');
				}
			});
		},
		/**
		 * refresh subscriptions status
		 */
		refreshSubStatus: function () {
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'node/status/subscription/refresh',
				type: 'POST',
				success: function () {
					current.loadStatus();
					notifyManager.notify(current.$messages.statusRefreshed);
				},
				beforeSend: function () {
					_('refreshSubBtn').disable().find('.fa-sync-alt').addClass('fa-spin');
				},
				complete: function () {
					_('refreshSubBtn').disable().find('.fa-sync-alt').removeClass('fa-spin');
				}
			});
		},

		dirty: function () {
			_('redirection').val($(this).closest('tr').find('a').attr('href'));
			_('save-redirect').addClass('btn-primary').removeClass('btn-default').removeClass('btn-success');
			current.consolidate();
		},

		/**
		 * Consolidate the current redirection text with the fixed URL.
		 */
		consolidate: function () {
			var url = _('redirection').val();
			var $selected = _('redirection-tools').find('.radio:checked');
			var $target = _('redirection-tools').find('tr').find('a[href="' + url + '"]').closest('tr').find('.radio input');
			if ($target.length) {
				if ($selected.length === 0 || $target[0] !== $selected[0]) {
					// Select has to be changed
					$selected.prop('checked', false);
					$target.first().prop('checked', true);
				}
			} else {
				// Uncheck the dirty radio
				$selected.prop('checked', false);
			}
		},

		/**
		 * Save the preferred URL
		 */
		saveRedirect: function () {
			$.ajax({
				type: 'POST',
				url: REST_PATH + 'redirect',
				dataType: 'text',
				data: _('redirection').val(),
				contentType: 'application/json',
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.updated)(current.$messages.redirect));
					_('save-redirect').addClass('btn-success').removeClass('btn-default').removeClass('btn-primary');
				}
			});
		}
	};
	return current;
});
