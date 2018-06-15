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
			return (typeof current.uiAuthorizations === 'undefined') || current.uiAuthorizations === null || current.isAllowed(url, current.uiAuthorizations);
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
			var methodsAsArray = (methods ? methods.toLowerCase() : '').split(',');
			var length = authorizations.length;
			// Method only matcher
			for (var index = 0; index < length; index++) {
				var method = authorizations[index].method;
				if (method === undefined || $.inArray(method, methodsAsArray) >= 0) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Determine whether requested API URL is allowed.
		 * @param {String} url				requested API URL.
		 * @param {String} methods			requested API methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}					true when allowed.
		 */
		isAllowedApiUrl: function (url, methods, authorizations) {
			var index;
			var length = authorizations.length;
			// URL matcher
			if (methods) {
				// URL + method matcher
				var methodsAsArray = methods.toLowerCase().split(',');
				for (index = 0; index < length; index++) {
					var authorization = authorizations[index];
					var method = authorization.method;
					if (authorization.pattern.test(url) && (method === undefined || $.inArray(method, methodsAsArray) >= 0)) {
						return true;
					}
				}
			} else {
				// URL only matcher
				for (index = 0; index < length; index++) {
					if (authorizations[index].pattern.test(url)) {
						return true;
					}
				}
			}
			traceDebug('Remove access to', url);
			return false;
		},

		/**
		 * Determine whether requested URL is allowed.
		 * @param {String} requested URL.
		 * @param {RegEx[]} valid authorizations.
		 * @return{Boolean} true when allowed.
		 */
		isAllowed: function (url, authorizations) {
			if (url) {
				var index;
				var length;
				for (index = 0, length = authorizations.length; index < length; index++) {
					if (authorizations[index].test(url)) {
						return true;
					}
				}
				traceDebug('Remove access to', url);
				return false;
			}
			return true;
		},

		/**
		 * Apply the security to the given jQuery selector.
		 * @param {Object} selector as constraint.
		 */
		applySecurity: function (selector) {
			selector = selector || _('_main');
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
				// FIX IE7 startsWith(^) -> contains(*)
				selector.find('[href*="#/"]').each(function () {
					var $that = $(this);
					if (!current.isAllowed($that.attr('href').split('#/')[1], uiAuthorizations)) {
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
				selector.find('[data-secured-service],[data-secured-method]').each(function () {
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
				selector.find('[data-secured-role]').each(function () {
					var $that = $(this);
					if ($.inArray($that.attr('data-secured-role'), roles) < 0) {
						current.pruneHierarchy($that);
					}
				});
			}
		},
		
		copyContext: function() {
			if ($cascade.session) {
				if (typeof $cascade.session.authorizations !== 'undefined') {
					traceLog('Deprecated usage of "authorizations", upgrade bootstrap to 2.4.5+'); 
					$cascade.session.uiAuthorizations = $cascade.session.authorizations;
					$cascade.session.apiAuthorizations = $cascade.session.businessAuthorizations;
				}
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
