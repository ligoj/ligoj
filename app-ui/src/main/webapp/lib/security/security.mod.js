/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
/**
 * Security manager based on URL pattern.
 */
define(['jquery', 'cascade'], function ($, $cascade) {
	var current = {

		/**
		 * Authorized URL. Undefined when there is no authorization security.
		 */
		uiAuthorizations: undefined,
		apiAuthorizations: undefined,

		initialize: function () {
			// Register a filter for all Ajax calls
			$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
				var serverUrlSplit = options.url && options.url.split('/');
				if (serverUrlSplit.length && serverUrlSplit[0].startsWith(REST_MATCH_PATH) && !current.isAllowedApi(options.url, options.type)) {
					// Cancel this before the server tell it
					traceLog('Not allowed call aborted', options.type + ' ' + options.url);
					jqXHR.abort();
				}
			});
		},

		/**
		 * Remove given item and the parent if empty.
		 * @param {Object} item to remove from the DOM.
		 */
		pruneHierarchy: function (item) {
			var parent = item.parent();
			if (parent.length === 1) {
				if (item.attr('data-security-on-forbidden') === 'disable') {
					item.addClass('disabled').addClass('security-disabled').removeAttr('href').attr('disabled', 'disabled').click(function (e) {
						e.preventDefault();
					});
					if (item.closest('.panel').length === 1) {
						item.closest('.panel').find('.panel-heading').addClass('disabled');
					}
				} else if (parent[0].tagName.toLowerCase() === 'td') {
					// Add IE7 fix, replace empty by space
					parent.html('&nbsp');
				} else if (item.closest('.panel').length === 1) {
					item.closest('.panel').remove();
				} else {
					var childrenSize = parent.children().length;
					if (childrenSize === 1 || (childrenSize === 2 && parent.children('[data-toggle="dropdown"]').length === 1)) {
						// Parent will be empty too
						current.pruneHierarchy(parent);
					} else {
						item.remove();
					}
				}
			}
		},

		/**
		 * Determine whether requested URL is allowed.
		 * @param {String} requested URL.
		 * @return{Boolean} true when allowed.
		 */
		isAllowed: function (url) {
			return (typeof current.uiAuthorizations === 'undefined') || current.uiAuthorizations === null || current.isAllowedInternal(url, current.uiAuthorizations);
		},

		/**
		 * Determine whether requested API URL is allowed.
		 * @param {String} url				requested API URL.
		 * @param {String} methods			requested API methods, ',' separated.
		 * @return {Boolean}				true when allowed.
		 */
		isAllowedApi: function (url, methods) {
			if (current.apiAuthorizations === undefined || current.apiAuthorizations === null) {
				// No configured authorization
				return true;
			}
			if (url) {
				// URL matcher
				return current.isAllowedApiUrl(url, methods, current.apiAuthorizations);
			}
			if (methods) {
				// Method only matcher
				return current.isAllowedApiMethod(methods, current.apiAuthorizations);
			}
			return true;
		},

		/**
		 * Determine whether requested API method is allowed.
		 * @param {String} methods			requested API methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}					true when allowed.
		 */
		isAllowedApiMethod: function (methods, authorizations) {
			var methodsAsArray = methods ? methods.toUpperCase().split(',') : [];
			return authorizations.find(function(a) { return typeof a.method === 'undefined' || methodsAsArray.includes(a.method);});
		},

		/**
		 * Determine whether requested API URL is allowed.
		 * @param {String} url				requested API URL.
		 * @param {String} methods			requested API methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}					true when allowed.
		 */
		isAllowedApiUrl: function (url, methods, authorizations) {
            var methodsAsArray = methods ? methods.toUpperCase().split(',') : [];
			// URL matcher
			var access = authorizations.find(function(a) { return a.pattern.test(url) && (methodsAsArray.length === 0 || a.method === 'undefined' || methodsAsArray.includes(a.method));});
			if (!access) {
			    traceDebug('Remove access to', url);
			}
			return access;
		},

		/**
		 * Determine whether requested URL is allowed.
		 * @param {String}  url      Requested URL.
		 * @param {RegEx[]} patterns Valid authorizations.
		 * @return{Boolean}          true when allowed.
		 */
		isAllowedInternal: function (url, patterns) {
            var access = typeof url !== 'string' || patterns.find(function(p) { return p.test(url);});
            if (!access) {
                traceDebug('Remove access to', url);
            }
            return access;
		},

		/**
		 * Apply the security to the given jQuery selector.
		 * @param {Object} selector as constraint.
		 */
		applySecurity: function ($selector) {
			$selector = $selector || _('_main');
			current.copyContext();

			// UI security filtering
			var uiAuthorizations = current.uiAuthorizations;
			var index;
			var length;
			if (uiAuthorizations && uiAuthorizations.length) {
				for (index = 0, length = uiAuthorizations.length; index < length; index++) {
					uiAuthorizations[index] = new RegExp(uiAuthorizations[index]);
				}

				// Remove invalid links
				$selector.find('[href^="#/"]').each(function () {
					var $that = $(this);
					if (!current.isAllowedInternal($that.attr('href').substring(2), uiAuthorizations)) {
						current.pruneHierarchy($that);
					}
				});
			}

			// API security filtering
			var apiAuthorizations = current.apiAuthorizations;
			if (apiAuthorizations && apiAuthorizations.length) {
				for (index = 0, length = apiAuthorizations.length; index < length; index++) {
					apiAuthorizations[index].pattern = new RegExp(apiAuthorizations[index].pattern);
				}

				// Remove invalid content
				$selector.find('[data-secured-service],[data-secured-method]').each(function () {
					var $that = $(this);
					if (!current.isAllowedApi($that.attr('data-secured-service'), $that.attr('data-secured-method'))) {
						current.pruneHierarchy($that);
					}
				});
			}

			// API security filtering
			var roles = current.roles = $cascade.session && $cascade.session.roles;
			if (roles && roles.length) {
				// Remove invalid content
				$selector.find('[data-secured-role]').each(function () {
					var $that = $(this);
					if ($.inArray($that.attr('data-secured-role'), roles) < 0) {
						current.pruneHierarchy($that);
					}
				});
			}
			
			// Enabled plug-ins filtering
			var plugins = current.plugins = $cascade.session && $cascade.session.applicationSettings && $cascade.session.applicationSettings.plugins;
			if (typeof plugins !== 'undefined') {
				// Remove invalid content
				$selector.find('[data-enabled-plugin]').each(function () {
					var $that = $(this);
					if ($.inArray($that.attr('data-enabled-plugin'), plugins) < 0) {
						current.pruneHierarchy($that);
					}
				});
			}
		},
		
		copyContext: function() {
			if ($cascade.session) {
				current.uiAuthorizations = $cascade.session.uiAuthorizations;
				current.apiAuthorizations = $cascade.session.apiAuthorizations;
			}
		}
	};

	// Make global
	window.securityManager = current;
	current.initialize();
	return current;
});
