/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
/**
 * Manager used to populate and manage global application features.
 */
define(['cascade'], function ($cascade) {
	var current = {
		/**
		 * Update the message counter.
		 */
		initialize: function () {
			current.updateMessageCounter();
		},
		/**
		 * Update the message counter.
		 */
		updateMessageCounter: function () {
			// Display unread messages counter
			var count = $cascade.session.userSettings.unreadMessages || 0;
			if (count) {
				var text = count > 99 ? '&#8734;' : count;
				current.$view.find('.bs-inbox .count').html(text).closest('.label').removeClass('hidden');
			} else {
				current.$view.find('.bs-inbox .count').empty().closest('.label').addClass('hidden');
			}
		},

		/**
		 * Trim the given object by removing properties either 'null', either 'undefined' either an empty String.
		 * These properties are deleted from the object. This is not a recursive operation.
		 * @param {object} data	The object to clean/trim.
		 */
		trimObject: function (data) {
			Object.keys(data).forEach(function (key) {
				if (typeof data[key] === 'undefined' || data[key] === null || data[key] === '' || data[key] === false) {
					delete data[key];
				}
			});
		},

		/**
		 * Icon of corresponding tool with optional recursive display.
		 * @param {Object|string} node The node : tool, service ... The priority is : 'uiCLasses', then 3rd fragment of node's identifier ('id' or the string value itself), then 2nd fragment of the node's identifier
		 * @param {string} suffix For URL icon, the suffix to add to the path.
		 * @param {boolean} dataSrc When defined, the resolved "img" source ("src") is also stored to "data-src". It permits a reset to the original src image after alter.
		 * @param {boolean} recursive When defined, the parent icon is prepended to this icon.
		 */
		toIcon: function (node, suffix, dataSrc, recursive) {
			var fragments = (node.id || node || '::').split(':');
			var result = current.toIconBase(node, suffix, dataSrc, fragments);
			if (recursive) {
				var parent = null;
				if (node.refined) {
					parent = node.refined;
				} else if (fragments.length > 2) {
					parent = fragments.slice(0, fragments.length - 1).join(':');
				}
				result = (parent ? current.toIcon(parent, suffix, null, true) + ' <i class="fas fa-angle-right" data-toggle="tooltip" title="' + current.getNodeName(node) + '"></i> ' : '') + result;
			}
			return result;
		},

		/**
		 * Icon of corresponding tool.
		 * @param {Object|string} node The node : tool, service ... The priority is : 'uiCLasses', then 3rd fragment of node's identifier ('id' or the string value itself), then 2nd fragment of the node's identifier
		 * @param {string} suffix For URL icon, the suffix to add to the path.
		 * @param {boolean} dataSrc When defined, the resolved "img" source ("src") is also stored to "data-src". It permits a reset to the original src image after alter.
		 * @param {array} fragments Identifier fragments built from the node.
		 */
		toIconBase: function (node, suffix, dataSrc, fragments) {
			var uiClasses = node && node.uiClasses;
			var title = current.getNodeName(node) || fragments[2] || fragments[1];
			var result;
			if (uiClasses) {
				// Use classes instead of picture
				result = uiClasses.startsWith('$') ? '<span class="icon-text">' + uiClasses.substring(1) + '</span>' : ('<i data-toggle="tooltip" title="' + title + '" class="fa-fw ' + uiClasses + '"></i>');
			} else if (fragments.length < 3) {
				// Simple service
				result = '<i data-toggle="tooltip" title="' + title + '" class="fas fa-wrench"></i>';
			} else {
				// Use a provided picture
				var url = 'main/service/' + fragments[1] + '/' + fragments[2] + '/img/' + fragments[2] + (suffix || '') + '.png';
				result = '<img src="' + url + '" data-toggle="tooltip" title="' + title + '" alt="" onerror="this.className=this.className+\' broken\'"' + (dataSrc ? ' data-src="' + url + '"' : '') + ' class="tool"/>';
			}
			return result;
		},

		/**
		 * Return a link depending on the target and target type : user, company, tree,...
		 * @param target The target : user, company, tree or group.
		 * @param type The target type : "user", "company", "tree", "node", "project" or "group".
		 * @return A link with icon depending on the target, title and text.
		 */
		getResourceLink: function (target, type) {
			return '<i class="' + current.targetTypeClass[type] + ' fa-fw" title="<strong>' + current.$messages[type] +'</strong> ' + current.getResourceName(target, type) + '" data-toggle="tooltip"></i> ' + current['get' + type.capitalize() + 'Link'](target);
		},

		/**
		 * Return the name of the given resource from it's localized name or technical name that should be never null.
		 * Try the localized value, then the 'name' attribute, then the 'name' attribute, then the 'id' attribute, then the resource itself.
		 * @param {Object|string} resource The resource object or plain string value.
		 * @param {type} The resource type : NODE, USER,... or undefined
		 * @return {string} The resource human readable name built from the available resource data. 
		 */
		getResourceName: function (resource, type) {
			return type === 'NODE' ? current.getNodeName(resource) : resource.name || resource.label || resource.id || resource;
		},

		/**
		 * Return the name of the given node from it's localized name or technical name that should be never null.
		 * Try the localized name of its identifier (id'), then the localized name of the node itself when 'string', then the 'name' attribute, then the 'name' attribute, then the 'id' attribute, then the node itself.
		 * @param {Object|string} node The node object or plain string value.
		 * @return {string} The node human readable name built from the available resource data. 
		 */
		getNodeName: function (node) {
			return (node.id && current.$messages[node.id]) || ((typeof node) === 'string' && current.$messages[node]) || node.name || node.label || node.id || node;
		},

		/**
		 * Return a link targeting the company page.
		 * @param company The company data.
		 * @return The company link markup.
		 */
		getCompanyLink: function (company) {
			return '<a href="#/id/home/company=' + (company.id || company) + '">' + (company.name || company) + '</a>';
		},

		/**
		 * Return a link targeting the group page.
		 * @param group The group data.
		 * @return The group link markup.
		 */
		getGroupLink: function (group) {
			return '<a href="#/id/home/group=' + (group.id || group) + '">' + (group.name || group) + '</a>';
		},

		/**
		 * Return a simple text, not a link as the function name may guess.
		 * The name is required because of the function source #getResourceLink().
		 * @param {Object|string} tree The organizational tree description.
		 * @return {string} The tree description string.
		 */
		getTreeLink: function (tree) {
			return tree.dn || tree;
		},

		/**
		 * Return a link targeting the project page. 
		 * @param {Object|string|number} project The project data : id, name,... The identifier is required, either in 'id' attribute, either as a string, either as a number value.
		 * @return {string} The project link markup.
		 */
		getProjectLink: function (project) {
			return '<a href="#/home/project/' + (project.id || project) + '">' + (project.name || project) + '</a>';
		},

		/**
		 * Return a link targeting the user page. Display the full name in the link.
		 * When there are not enough data to build it, no first name or no last name, then the first later of the login and the the remaining are used to build the full name.
		 * For sample 'aeinstein' will be display as fail-safe value : 'A. Einstein'.
		 * @param {Object|string} user The user data : login, full name, etc... The identifier is required, either in 'id' attribute, either as a string.
		 * @param {string} text The optional text to display. When empty, full name is used.
		 * @return {string} The user link markup.
		 */
		getUserLink: function (user, text) {
			if (user) {
				// Popover content
				var content = user.firstName ? current.$messages.firstName + ' : ' + user.firstName + '<br>' : '';
				content += user.lastName ? current.$messages.lastName + ' : ' + user.lastName + '<br>' : '';
				content += user.company ? current.$messages.company + ' : ' + user.company + '<br>' : '';
				content += current.$messages.identifier + ' : ' + user.id;
				content += user.locked ? '<br>' + Handlebars.compile(current.$messages['locked-details'])([
					moment(user.locked).format(formatManager.messages.shortDateMomentJs),
					user.lockedBy
				]) : '';
				content += user.isolated ? '<br>' + Handlebars.compile(current.$messages['isolated-details'])(user.previousCompany) : '';
				content = content.replace(/'/g, '&apos;');

				// Popover title
				var fullName = current.getFullName(user);

				// Link text
				text = text || fullName;
				return '<a' + (user.locked ? ' class="locked"' : '') + ' href="#/id/user/' + user.id + '" rel="popover" data-toggle="popover" data-placement="left" data-title="' + fullName + '" data-trigger="hover" data-html="true" data-content=\'' + content + '\'>' + text + '</a>';
			}
			return current.$messages.unknown;
		},

		/**
		 * Return a link targeting to the user page. Display only user name in the link.
		 * @param {Object|string} user The user data : login, fullname, etc... The identifier is required, either in 'id' attribute, either as a string.
		 * @return {string} The user link markup with user identifier as text.
		 */
		getUserLoginLink: function (user) {
			return current.getUserLink(user, user && user.id);
		},

		/**
		 * Return the full name of given user. May be built from the provided information.
		 * When there are not enough data to build it, no first name or no last name, then the first later of the login and the the remaining are used to build the full name.
		 * @param {Object|string} user The user data : login, fullname, etc... The identifier is required, either in 'id' attribute, either as a string.
		 * @return {string} The full name of given user. 
		 */
		getFullName: function (user) {
			if (user.fullName) {
				return user.fullName;
			}
			if (user.firstName && user.lastName) {
				return user.firstName + ' ' + user.lastName;
			}
			if (user.firstName) {
				return user.firstName + ' <italic>' + user.id.substring(1) + '</italic>';
			}
			if (user.lastName) {
				return '<italic>' + user.id.substring(0, 1).capitalize() + '</italic>. ' + user.lastName;
			}

			// Fail safe rendering based on login
			var id = user.id || user || '??';
			return '<italic>' + id.substring(0, 1).capitalize() + '</italic>. <italic>' + id.substring(1).capitalize() + '</italic>';
		},

		/**
		 * Return the relevant 2 letters identifying the given user.
		 * @param {Object|string} user The user data : login, fullname, etc... The identifier is required, either in 'id' attribute, either as a string.
		 * @return {string} The relevant 2 letters identifying the given user.
		 */
		toUser2Letters: function (user) {
			if (user.firstName && user.lastName) {
				return user.firstName.charAt(0) + user.lastName.charAt(0);
			}
			if (user.fullName) {
				// Use first letter of first and last part of the full name
				var split = user.fullName.split(' ');
				if (split.length === 1) {
					// No words detected
					return user.fullName.charAt(0) + (user.fullName.length >= 2 ? user.fullName.charAt(1) : '');
				}
				return split[0].charAt(0) + split[split.length - 1].charAt(0);
			}

			// Fail safe rendering based on login
			var id = user.id || user || '??';
			if (id.length === 1) {
				id = id + id;
			}
			return id.charAt(0) + id.charAt(1);
		},

		/**
		 * Fill audit data in the UI
		 */
		fillAuditData: function (data) {
			if (data && (data.createdBy || data.lastModifiedDate || data.lastModifiedBy || data.createdDate)) {
				$('.project-name').attr('title', Handlebars.compile(current.$messages.audit)([
					current.getUserLink(data.createdBy),
					moment(data.createdDate).format(formatManager.messages.shortDateMomentJs),
					current.getUserLink(data.lastModifiedBy),
					moment(data.lastModifiedDate).format(formatManager.messages.shortDateMomentJs)
				])).removeClass('hidden');
			} else {
				_('detail-audit').addClass('hidden');
			}
		},

		/**
		 * Diacritics mapping
		 */
		defaultDiacriticsRemovalMap: [{
			base: 'A',
			letters: /[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g
		}, {
			base: 'C',
			letters: /[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g
		}, {
			base: 'E',
			letters: /[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g
		}, {
			base: 'I',
			letters: /[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g
		}, {
			base: 'N',
			letters: /[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g
		}, {
			base: 'O',
			letters: /[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g
		}, {
			base: 'U',
			letters: /[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g
		}, {
			base: 'a',
			letters: /[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g
		}, {
			base: 'c',
			letters: /[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g
		}, {
			base: 'e',
			letters: /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g
		}, {
			base: 'i',
			letters: /[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g
		}, {
			base: 'n',
			letters: /[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g
		}, {
			base: 'o',
			letters: /[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g
		}, {
			base: 'u',
			letters: /[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g
		}],

		newSelect2User: function (selector, filter, placeholder) {
			return current.newSelect2(selector, REST_PATH + 'service/id/user' + (filter || ''), placeholder || current.$messages.user, function (object) {
				return object.id + ' [<small>' + current.$main.getFullName(object) + '</small>]';
			});
		},
		newSelect2Node: function (selector, filter, placeholder, suffix, dataSrc, recursive, toItem) {
			return current.newSelect2(selector, REST_PATH + 'node' + (filter || ''), placeholder || current.$messages.node, function (object) {
				return current.toIcon(object, suffix, dataSrc, recursive) + ' ' + current.getNodeName(object);
			}, null, null, toItem);
		},
		newSelect2Project: function (selector, filter, placeholder, textFunction, idProperty, textProperty) {
			return current.newSelect2(selector, REST_PATH + 'project' + (filter || ''), placeholder || current.$messages.project, textFunction, idProperty || 'id', textProperty || 'name');
		},
		newSelect2Company: function (selector, filter, placeholder) {
			return current.newSelect2Container(selector, filter, placeholder, 'company');
		},
		newSelect2Group: function (selector, filter, placeholder) {
			return current.newSelect2Container(selector, filter, placeholder, 'group');
		},
		newSelect2Container: function (selector, filter, placeholder, type) {
			return current.newSelect2(selector, REST_PATH + 'service/id/' + type + '/filter' + (filter || '/read'), placeholder || current.$messages[type]);
		},
		newSelect2: function (selector, url, placeholder, textFunction, idProperty, textProperty, toItem) {
			var toText = function (object) {
				return object && (textFunction ? textFunction(object) : ((textProperty && object[textProperty]) || object.text || object));
			};

			// Decorate the Select2 label
			$(selector).closest('.form-group').find('.control-label').addClass('select2-label');
			return $(selector).select2({
				placeholder: $(selector).closest('.label-floating').length ? '&nbsp;' : placeholder,
				allowClear: true,
				minimumInputLength: 0,
				initSelection: function (element, callback) {
					callback(element.val() && {
						id: element.val(),
						text: toText(element.val())
					});
				},
				formatSelection: function (object) {
					return toText(object.data || object);
				},
				formatResult: function (object) {
					return toText(object.data || object);
				},
				escapeMarkup: function (m) {
					return m;
				},
				formatSearching: function () {
					return current.$messages.loading;
				},
				ajax: {
					url: url,
					dataType: 'json',
					data: function (term, page) {
						return {
							'search[value]': term, // search term
							'q': term, // search term
							'rows': 15,
							'page': page,
							'start': (page - 1) * 15,
							'filters': '{}',
							'sidx': 'name',
							'length': 15,
							'columns[0][name]': textProperty || 'name',
							'order[0][column]': 0,
							'order[0][dir]': 'asc',
							'sord': 'asc'
						};
					},
					results: function (data, page) {
						var result = [];
						$(data.data).each(function () {
							var item = {
								id: (idProperty && this[idProperty]) || this.id || this,
								data: this,
								text: toText(this)
							};
							result.push(toItem ? toItem(item) : item);
						});
						return {
							more: data.recordsFiltered > page * 10,
							results: result
						};
					}
				}
			});
		},

		/**
		 * Remove all diacritics and transform to lower case.
		 * @param {string} str the string to normalize.
		 * @return {string} The normalized value.
		 */
		normalize: function (str) {
			var i;
			var changes = current.defaultDiacriticsRemovalMap;
			str = str.replace(/[-[()\]${},;_:]/g, ' ').replace(/( (de|du|des|l'|d'|le|la|les|au|aux))+ /gi, ' ').replace(/ {2,}/g, ' ');
			for (i = 0; i < changes.length; i++) {
				str = str.replace(changes[i].letters, changes[i].base);
			}
			return str.toLowerCase();
		},

		/**
		 * Return the tool identifier part from a node identifier. It's the first level of refinement, just
		 * after service. This corresponds to the first implementation of a service.
		 */
		getToolFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			const data = id.split(':');
			return data.length > 2 && data.slice(0, 3).join('-');
		},

		/**
		 * Return the identifier of each hierarchy nodes until the service.
		 */
		getHierarchyId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			const data = id.split(':');
			let index;
			let result = '';
			for (index = 2; index <= data.length; index++) {
				result += ' ' + data.slice(0, index).join('-');
			}
			return result;
		},

		/**
		 * Return the service identifier part from a node identifier.
		 */
		getServiceFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			const data = id.split(':');
			return data.length > 1 && data.slice(0, 2).join('-');
		},

		/**
		 * Return the service simple name part from a node identifier.
		 */
		getServiceNameFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			return id.split(':')[1];
		},

		/**
		 * Return the service simple name part from a node identifier.
		 */
		getToolNameFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			return id.split(':')[2];
		},

		/**
		 * Icon of corresponding tool, and entity's "name".
		 */
		toIconNameTool: function (node) {
			return current.toIcon(node) + '<span class="hidden-xs"' + (node.description ? ' title="' + node.description + '"' : '') + '> ' + current.getNodeName(node) + '</span>';
		},

		toToolBaseIcon: function (node) {
			const fragments = node.split(':');
			return 'main/service/' + fragments[1] + '/' + fragments[2] + '/img/' + fragments[2];
		},

		/**
		 * Return the root of refinement. This corresponds to the basic service. The result will be cached.
		 */
		getService: function (node) {
			if (node.service) {
				return node.service;
			}
			node.service = (node.refined && this.getService(node.refined)) || node;
			return node.service;
		},

		/**
		 * Return the first level of refinement, just after root. This corresponds to the first implementation
		 * of a service. The result will be
		 * cached.
		 */
		getTool: function (node) {
			if (node.tool) {
				return node.tool;
			}
			if (node.refined) {
				if (node.refined.refined) {
					node.tool = this.getTool(node.refined);
				} else {
					node.tool = node;
				}
			} else {
				return null;
			}
			return node.tool;
		},

		/**
		 * Load dependencies of given node identifier, and call given callback when :
		 * <ul>
		 * <li>HTML is integrated inside the current view if was not</li>
		 * <li>CSS is loaded and loaded</li>
		 * <li>JavaScript is loaded, injected and initialized</li>
		 * </ul>
		 * @param {object} context Context requesting this service.
		 * @param node Node identifier to prepare dependencies.
		 * @param callback Optional function to call when all dependencies are loaded and initialized.
		 * Parameter will be the controller of the service.
		 */
		requireService: function (context, node, callback) {
			// Check the plugin is enabled
			if (node && typeof securityManager.plugins !== 'undefined' && $.inArray(node.split(':').slice(0, 2).join(':'), securityManager.plugins) < 0) {
				callback && callback();
				return;
			}

			const service = current.getServiceNameFromId(node);
			const path = 'main/service/' + service + '/';
			if (path === context.$path) {
				// Current context is loaded
				return callback && callback(context);
			}
			$cascade.loadFragment(context, context.$transaction, path, service, {
				callback: function ($context) {
					$context.node = 'service:' + service;
					callback && callback($context);
				},
				errorCallback: function (err) {
					errorManager.ignoreRequireModuleError(err.requireModules);
					errorManager.ignoreRequireModuleError(['main/service/' + service + '/nls/messages']);
					callback && callback();
				},
				plugins: ['css', 'i18n', 'partial', 'js']
			});
		},

		/**
		 * Load dependencies of given node identifier, and call given callback when :
		 * <ul>
		 * <li>HTML is integrated inside the service's view if was not</li>
		 * <li>CSS is loaded and loaded</li>
		 * <li>JavaScript is loaded, injected and initialized</li>
		 * <li>All above dependencies for service and for tool, and in this order</li>
		 * </ul>
		 * @param {object} context Context requesting this service.
		 * @param node Node identifier to prepare dependencies.
		 * @param callback Optional function to call when all dependencies are loaded and initialized.
		 * Parameter will be the controller of the tool.
		 */
		requireTool: function (context, node, callback) {
			// First, load service dependencies
			const transaction = context.$transaction;

			// Check the plugin is enabled
			if (node && typeof securityManager.plugins !== 'undefined' && $.inArray(node.split(':').slice(0, 3).join(':'), securityManager.plugins) < 0) {
				callback && callback();
				return;
			}
			current.requireService(context, node, function ($service) {
				if (typeof $service === 'undefined') {
					callback && callback();
					return;
				}

				// Then, load tool dependencies
				const service = current.getServiceNameFromId(node);
				const tool = current.getToolNameFromId(node);
				const path = 'main/service/' + service + '/' + tool;
				if (path === context.$path) {
					// Current context is loaded
					return callback && callback(context);
				}
				$cascade.loadFragment($service, transaction, path, tool, {
					callback: function ($tool) {
						$tool.node = 'service:' + service + ':' + ':' + tool;
						callback && callback($tool, $service);
					},
					errorCallback: function (err) {
						errorManager.ignoreRequireModuleError(err.requireModules);
						errorManager.ignoreRequireModuleError(['main/service/' + service + '/' + tool + '/nls/messages']);
						callback && callback(null, $service);
					},
					plugins: ['css', 'i18n', 'partial', 'js']
				});
			});
		},

		/**
		 * Return the "name" of the given entity
		 */
		toName: function (object) {
			return object.name;
		},

		/**
		 * Return the given entity
		 */
		toIdentity: function (object) {
			return object;
		},

		/**
		 * Return the "text" of the given entity
		 */
		toText: function (object) {
			return object.text;
		},

		/**
		 * Return the "description" of the given entity
		 */
		toDescription: function (object) {
			return object.description;
		},

		/**
		 * Object type to class mapping.
		 */
		targetTypeClass: {
			company: 'resource far fa-building',
			group: 'resource fas fa-users',
			project: 'resource fas fa-folder',
			user: 'resource fas fa-user',
			tree: 'resource fas fa-code-branch fa-rotate-90',
			node: 'resource fas fa-wrench'
		},

		/**
		 * Escape HTML content. From "<b>Value'&amp;"</b>" gives "&lt;b&gt;Value&#39;&amp;amp;&quot;&gt;/b&gt;"
		 * @param {string} str  Markup string to protect.
		 * @return {string}     Protected string.
		 */
		htmlEscape: function (str) {
			return typeof str === 'string' ? str
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;') : '';
		},

		/**
		 * Opposite function of "htmlEscape"
		 * @param {string} str  Protected markup string to retrieve.
		 * @return {string}     Unprotected string.
		 */
		htmlUnescape: function (str) {
			return str
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&');
		}
	};
	return current;
});
