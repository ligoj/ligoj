/**
 * Security manager based on URL pattern.
 */
define(['jquery', 'cascade'], function ($, $cascade) {
	var current = {

		/**
		 * Authorized URL. Undefined when there is no authorization security.
		 */
		authorizations: undefined,
		businessAuthorizations: undefined,

		initialize: function () {
			// Register a filter for all Ajax calls
			$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
				var serverUrlSplit = options.url && options.url.split('/');
				if (serverUrlSplit.length && serverUrlSplit[0].startsWith(REST_MATCH_PATH) && !current.isAllowedBusiness(options.url, options.type)) {
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
		_pruneHierarchy: function (item) {
			var parent = item.parent();
			if (parent.size() === 1) {
				if (item.attr('data-security-on-forbidden') === 'disable') {
					item.addClass('disabled').addClass('security-disabled').removeAttr('href').attr('disabled', 'disabled').click(function (e) {
						e.preventDefault();
					});
					if (item.closest('.panel').size() === 1) {
						item.closest('.panel').find('.panel-heading').addClass('disabled');
					}
				} else if (parent[0].tagName.toLowerCase() === 'td') {
					// Add IE7 fix, replace empty by space
					parent.html('&nbsp');
				} else if (item.closest('.panel').size() === 1) {
					item.closest('.panel').remove();
				} else {
					var childrenSize = parent.children().size();
					if (childrenSize === 1 || (childrenSize === 2 && parent.children('[data-toggle="dropdown"]').size() === 1)) {
						// Parent will be empty too
						current._pruneHierarchy(parent);
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
			return current.authorizations === undefined || current.authorizations === null || current._isAllowed(url, current.authorizations);
		},

		/**
		 * Determine whether requested business URL is allowed.
		 * @param {String} requested business URL.
		 * @param {String} requested business method.
		 * @return{Boolean} true when allowed.
		 */
		isAllowedBusiness: function (url, method) {
			return current.businessAuthorizations === undefined || current.businessAuthorizations === null || current._isAllowedBusiness(url, method, current.businessAuthorizations);
		},

		/**
		 * Determine whether requested business URL is allowed.
		 * @param {String} url				requested business URL.
		 * @param {String} methods			requested business methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}				true when allowed.
		 */
		_isAllowedBusiness: function (url, methods, authorizations) {
			if (url) {
				// URL matcher
				return current._isAllowedBusinessUrl(url, methods, authorizations);
			}
			if (methods) {
				// Method only matcher
				return current._isAllowedBusinessMethod(methods, authorizations);
			}
			return true;
		},

		/**
		 * Determine whether requested business method is allowed.
		 * @param {String} methods			requested business methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}					true when allowed.
		 */
		_isAllowedBusinessMethod: function (methods, authorizations) {
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
		 * Determine whether requested business URL is allowed.
		 * @param {String} url				requested business URL.
		 * @param {String} methods			requested business methods, ',' separated.
		 * @param {RegEx[]} authorizations	valid authorizations.
		 * @return {Boolean}					true when allowed.
		 */
		_isAllowedBusinessUrl: function (url, methods, authorizations) {
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
		_isAllowed: function (url, authorizations) {
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

			// UI security filtering
			var authorizations = current.authorizations = $cascade.session && $cascade.session.authorizations;
			var index;
			var length;
			if (authorizations !== undefined && authorizations && authorizations.length) {
				for (index = 0, length = authorizations.length; index < length; index++) {
					authorizations[index] = new RegExp(authorizations[index]);
				}

				// Remove invalid links
				// FIX IE7 startsWith(^) -> contains(*)
				selector.find('[href*="#/"]').each(function () {
					var $that = $(this);
					if (!current._isAllowed($that.attr('href').split('#/')[1], authorizations)) {
						current._pruneHierarchy($that);
					}
				});
			}

			// Business security filtering
			var businessAuthorizations = current.businessAuthorizations = $cascade.session && $cascade.session.businessAuthorizations;
			if (businessAuthorizations !== undefined && businessAuthorizations && businessAuthorizations.length) {
				for (index = 0, length = businessAuthorizations.length; index < length; index++) {
					businessAuthorizations[index].pattern = new RegExp(businessAuthorizations[index].pattern);
				}

				// Remove invalid content
				selector.find('[data-secured-service],[data-secured-method]').each(function () {
					var $that = $(this);
					if (!current._isAllowedBusiness($that.attr('data-secured-service'), $that.attr('data-secured-method'), businessAuthorizations)) {
						current._pruneHierarchy($that);
					}
				});
			}

			// Business security filtering
			var roles = current.roles = $cascade.session && $cascade.session.roles;
			if (roles && roles.length) {
				// Remove invalid content
				selector.find('[data-secured-role]').each(function () {
					var $that = $(this);
					if ($.inArray($that.attr('data-secured-role'), roles) < 0) {
						current._pruneHierarchy($that);
					}
				});
			}
		}
	};

	// Make global
	window.securityManager = current;
	current.initialize();
	return current;
});
