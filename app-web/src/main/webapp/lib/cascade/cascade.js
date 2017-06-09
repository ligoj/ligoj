/*!
 * Cascade v0.0.2 (https://github.com/fabdouglas/cascadejs)
 * Copyright 2016 Fabrice Daugan.
 * Licensed under the MIT license
 */
define([
	'jquery', 'hashchange/hashchange'
], function ($) {
	var $self = {

		/**
		 * Protected, and also injected properties inside the contexts.
		 * @type {Array}
		 */
		protected: [
			'$parent',
			'$page',
			'$messages',
			'$require',
			'$view',
			'$path',
			'$url',
			'$data',
			'$hindex',
			'$fragment',
			'$parameters',
			'$template'
		],

		/**
		 * API functions copied to the new context and pointing to the functions of cascade.
		 * @type {Array}
		 */
		apiFunctions: [
			'closest', 'super'
		],

		/**
		 * Current context hierarchy. Correspond to the last loaded context. $parent targets the ancestor context.
		 * @type {[type]}
		 */
		$current: null,

		/**
		 * Computed messages.
		 */
		$messages: null,

		/**
		 * Current transaction identifier
		 * @type {Number}
		 */
		transaction: 0,

		/**
		 * Session, not null when has been loaded.
		 * @type {object}
		 */
		session: null,

		/**
		 * This list is filled by JavaScript modules listening for a module HTML load, and before modules's
		 * JavaScript
		 * @type {array}
		 */
		callbacks: [],

		/**
		 * Unload all modules of given context from the AMD. The modules are unloaded in the reverse order of the associated loaded plugin.
		 * @param  {context}  Context to undefine modules
		 */
		undefModules: function (context) {
			for (var index = context.$plugins.length; index-- > 0;) {
				var plugin = context.$plugins[index];
				var configuration = $self.plugins[plugin].unload;
				// Call the unload controller if defined for this plugin
				configuration && configuration.controller && configuration.controller(context.$require[plugin], context);
			}
		},

		/**
		 * Unload given context, its child and the siblings. Is recursive.
		 * @param  {array} context Context to unload.
		 */
		unload: function (context) {
			// First, unload children
			if (context.$siblings) {
				for (var index = 0; index < context.$siblings.length; index++) {
					$self.unload(context.$siblings[index]);
				}
				delete context.$siblings;
			}
			if (context.$child) {
				$self.unload(context.$child);
				delete context.$child;
			}

			// Unload event for the page and parent
			context.$page && (typeof context.$page.unload) === 'function' && $.proxy(context.$page.unload, context.$page)(context);
			context.$parent && (typeof context.$parent.unload) === 'function' && $.proxy(context.$parent.unload, context.$parent)(context);

			// Finally undefine the AMD modules
			context.$unloaded = true;
			$self.undefModules(context);
			return context.$parent;
		},

		/**
		 * Return the context chain as an array.
		 * @param  {object} context A not null context.
		 * @return {array}          The context chain from root to the leaf.
		 */
		getContextHierarchy: function (context) {
			var result = [];
			while (context) {
				result.unshift(context);
				context = context.$parent;
			}
			return result;
		},

		/**
		 * Browse internally to given hash URL
		 */
		load: function (url, reload) {
			applicationManager.debug && traceDebug('browse', url);
			url = url || '';

			// Check the security
			if (typeof securityManager !== 'undefined' && !securityManager.isAllowed(url)) {
				// Check access -> Forbidden
				if (typeof errorManager === 'undefined') {
					applicationManager.debug && traceDebug('Forbidden access for URL', url);
				} else {
					errorManager.manageSecurityError(url);
				}

				// Stop the navigation
				return;
			}
			var fragments = url ? url.split('/') : [];
			// Add implicit 'main' and root fragments
			fragments.unshift('main');
			fragments.unshift('root');

			// Prepare the context
			var context = $self.$current || {
				$view: $('body'),
				$path: '',
				$url: '#/',
				$hindex: 0,
				$fragment: '',
				$siblings: [],
				$home: ''
			};

			// Create a new transaction
			var transaction = $self.newTransaction();

			// Protected zone
			require(['zone-protected'], function () {
				// First load, ensure the first level is loaded before the private/public zone
				if ($self.session) {
					$self.securedZoneLoader(context, transaction, fragments, reload);
				} else {
					$self.appendSpin($('[data-cascade-hierarchy="1"]').off().empty(), 'fa-3x');
					$self.off('session').register('session', function () {
						$self.securedZoneLoader(context, transaction, fragments, reload);
					});
				}
			});
		},

		securedZoneLoader: function (context, transaction, fragments, reload) {
			$self.loadFragmentRecursive(context, transaction, fragments, 1, reload, function (childContext) {
				// Private zone and modules
				require(['zone-private'], function () {
					// Load the remaining context hierarchy
					$self.loadFragmentRecursive(context.$child || childContext, transaction, fragments, 2, reload);
				});
			});
		},

		/**
		 * Recursively load the remaining context hierarchy. This function is called until the last loaded context read the target index
		 * corresponding to the fragment length.
		 * Pre-condition : context.$hindex >= hindex
		 * Post-conditions : $self.$current.$hindex >= hindex
		 *
		 * @param  {object} context     The actual loaded context.
		 * @param  {array} fragments    Fragments of current URL. A not null array.
		 * @param  {integer} hindex     The context hierarchy index to validate. All previous contexts inside the hierarchy of given context
		 *                              have been validated and are loaded. Work as a cursor. A positive number.
		 * @param  {function} callback  When defined, this callback is called instead of the current function when the fragment is loaded.
		 *                              The parameters will be in the order with theses properties :
		 *                              - context : May be the same if the current hierarchy index still valid against the target fragments.
		 *                              - fragments : Same value than the original parameter.
		 *                              - hindex : Incremented (+1) parameter value.
		 *                              - callback : undefined.
		 */
		loadFragmentRecursive: function (context, transaction, fragments, hindex, reload, callback) {
			/* We need to check the delta to compute the parts to load/unload by comparing : the fragment of context at a specific position of the
			 * hierarchy and the URL fragment at the same position.
			 * There is a difference when :
			 * - fragment is defined and different from the defined one of compared context
			 * - fragment is not defined, but the defined one of compared context does not correspond to the home context of the parent
			 */
			var hierarchy = $self.getContextHierarchy(context);
			var parent = hierarchy[hindex - 1];
			var sharedContext = hierarchy[hindex];
			if (sharedContext) {
				if (sharedContext.$fragment && sharedContext.$fragment !== fragments[hindex] && ((typeof fragments[hindex] !== 'undefined') || sharedContext.$fragment !== (sharedContext.$parent.$home || 'home'))) {
					// Different context root, recursively unload all related contexts and move context its parent
					context = $self.unload(sharedContext);
				} else {
					// Same context, no fragment to load at this point, continue to the next hierarchy index
					if (fragments.length <= hindex) {
						// Add fragment from the validated and yet not explicitly
						fragments.push(sharedContext.$fragment);
					}
					$self.loadFragmentRecursive(context, transaction, fragments, hindex + 1, reload);
					return;
				}
			}

			// Build the remaining fragments and considered as parameters
			var parameters = fragments.slice(hindex).join('/');

			// Check the cursor
			if (hindex >= fragments.length) {
				// Load is completed but we have to check the implicit fragments such as "home"
				if ($self.finalize(parent, parameters, transaction)) {
					// There is no more implicit fragments to add, and there is no parameter
					return;
				}
				// This module contains a landing page. It is added to the explicit fragments, and the recursive process continues
				fragments.push(parent.$home || 'home');
			} else if ($self.finalize(parent, parameters, transaction)) {
				// All remaining fragments have been consumed as parameters
				return;
			}

			// At least one fragment need to be loaded
			var id = fragments[hindex];

			$self.loadFragment(parent, transaction, ((parent.$path || '') + '/').replace(/^\//, '') + id, id, {
				fragment: id,
				reload: reload,
				hindex: hindex,
				parameters: fragments.slice(hindex + 1).join('/'),
				callback: callback || function (childContext) {
					$self.loadFragmentRecursive(context.$child || childContext, transaction, fragments, hindex + 1, reload);
				}
			});
		},

		loadFragment: function (context, transaction, home, id, options) {
			options.plugins = options.plugins || $self.plugins.default;
			$self.loadPlugins(options.plugins, function () {
				$self.loadFragmentInternal(context, transaction, home, id, options);
			});
		},

		loadPlugins: function (plugins, callback) {
			var requiredPath = [];
			var requiredNames = [];
			for (var index = 0; index < plugins.length; index++) {
				var plugin = plugins[index];
				if (typeof $self.plugins[plugin] === 'undefined') {
					// This plugin has not yet been loaded
					requiredPath.push('plugins/' + plugin);
					requiredNames.push(plugin);
				}
			}
			if (requiredPath.length) {
				require(requiredPath, function () {
					for (var index = 0; index < requiredPath.length; index++) {
						var $plugin = arguments[index];
						$plugin.$cascade = $self;
						$self.plugins[requiredNames[index]] = $plugin;
						$plugin.intialize && $plugin.initialize();
					}
					callback && callback();
				});
			} else {
				callback && callback();
			}
		},

		/**
		 * For each enabled plugins, load the associated module of the given <code>id</code> and <code>home</code>. The plugin order is important
		 * because of the UX. For sample, a "css" plugin should be loaded before an html. In addition this order ensure the reversed unload to
		 * make the HTML unloaded before the CSS and avoid a displayed dirty HTML.
		 * @param {object} context  The parent context to use.
		 * @param {String} home     The home URL of module to load. CSS, HTML, i18n and controller will be loaded from this base.
		 * @param {String} id       The module identifier. Used to determine the base file name inside the home URL.
		 * @param {object} options  Optional options in addition of the ones defined in each plugin :
		 *                            - {function} callback      Callback when all modules are loaded, controller is initialized.
		 *                            - {string} fragment        Related URL fragment part associated to this context.
		 *                            - {array} plugins          Enabled plugin names for this fragment. When undefined, the default plugins are used.
		 *                            - {integer} hindex         When defined (>=0) without "$parentElement", will be used to resolve the parent
		 *                                                       element and will be used as "$parentElement".
		 *                                                       May also be useful for CSS selectors to change the display of component
		 *                                                       depending the placement inside the hierarchy.
		 *                                                       The CSS selector (where X corresponds to hdindex) used to resolve this parent
		 *                                                       will be: #_hierarchy-X,[data-cascade-hierarchy=X],.data-cascade-hierarchy-X
		 *                            - {object} data            Data to save in the new context inside "$data".
		 *                            - {string} parameters      Parameters as string to pass to the controller during the initialization.
		 */
		loadFragmentInternal: function (context, transaction, home, id, options) {
			options.home = home.replace(/\/$/, '');
			options.base = options.home + '/' + id;
			options.id = id;
			options.context = context;

			// Build the required modules
			var index;
			var requireJsModules = [];
			for (index = 0; index < options.plugins.length; index++) {
				var plugin = $self.plugins[options.plugins[index]];
				requireJsModules.push(plugin.load.require(options));
			}

			// Load with AMD the resources
			require(requireJsModules, function () {
				// Check the context after this AMD call
				if (!$self.isSameTransaction(transaction)) {
					return;
				}

				// Build the trimmed URL by removing the root path (main)
				var url = home.split('/');
				url.shift();

				// Associate the requireJs module to the load plugin
				var resolved = {};
				var $require = {};
				for (index = 0; index < options.plugins.length; index++) {
					$require[options.plugins[index]] = requireJsModules[index];
					resolved[options.plugins[index]] = arguments[index];
				}

				// Configure the new context
				var $current = $.extend($self.failSafeContext(resolved.js || {}, context, transaction), {
					$path: home,
					$cascade: $self,
					$url: '#/' + url.join('/'),
					$data: options.data,
					$hindex: options.hindex,
					$fragment: options.fragment,
					$parameters: options.parameters,
					$plugins: options.plugins,
					$require: $require
				});
				$self.copyAPI($current);

				// Process each plugin
				var skipContext = false;
				for (index = 0; index < options.plugins.length; index++) {
					skipContext |= ($self.plugins[options.plugins[index]].load.controller || $.noop)(arguments[index], options, $current);
				}
				if (skipContext) {
					return true;
				}

				// Insert the compiled view in the wrapper
				$self.trigger('fragment-' + id, context, context);

				// Initialize the controller
				$self.initializeContext($current, transaction, options.callback, options.parameters);
			});
		},

		/**
		 * Supported plugins of cascade.
		 * @type {Object}
		 */
		plugins: {
			/**
			 * Ordered plugins to load by default. Unload will be processed in the reversed order.
			 * @type {Array}
			 */
		},

		/**
		 * Copy and proxy API function of this loader to the the target context.
		 * @param  {context} $context Target context.
		 */
		copyAPI: function ($context) {
			for (var index = 0; index < $self.apiFunctions.length; index++) {
				var api = $self.apiFunctions[index];
				$context['$' + api] = $self.proxy($context, $self[api]);
			}
		},

		/**
		 * Simple proxy adding the current context to the first parameter.
		 * @param  {object} $context Current context.
		 * @param  {function} func     Real function to call.
		 * @return {function}          Proxy function.
		 */
		proxy: function ($context, func) {
			return function () {
				var args = Array.prototype.slice.call(arguments);
				args.unshift($context);
				return func.apply($context, args);
			};
		},

		/**
		 * Share context of "from" with the formal "to object. All injectected CascadeJS properties are copied, and only these ones.
		 * @param  {object} from Source context containing injected properties.
		 * @param  {object} to   Target context to fill.
		 */
		shareContext: function (from, to) {
			for (var i = 0; i < $self.protected.length; i++) {
				to[$self.protected[i]] = from[$self.protected[i]];
			}
			to.$page = from;
		},

		/**
		 * Load partials from a markup definition, inject the compiled template HTML inside the current element with loaded i18n file, load the CSS and initialize the controller.
		 * 'data-ajax' attribute defines the identifier of resources to load. Is used to build the base name of HTML, JS,... and also used as an identifier built with the identifier of containing view.
		 * 'data-plugins' attribute defines the resources to be loaded. By default the HTML template is loaded and injected inside the current element.
		 * @param {function} callback Optional callback when partial is loaded.
		 */
		loadPartial: function (callback, $parent) {
			var $target = $(this);
			var context = $self.$current;
			callback = typeof callback === 'function' ? callback : null;

			// Get the resource to load : HTML, CSS, JS, i28N ? By default the HTML is loaded
			var plugins = ($target.attr('data-plugins') || 'html').split(',');
			var id = $target.attr('data-ajax');
			var home = context.$path;
			if (id.charAt(0) === '/') {
				// Absolute path for home
				var index = id.lastIndexOf('/');
				home = id.substr(1, index - 1);
				id = id.substr(index + 1);
				while (context && context.$path !== home) {
					context = context.$parent;
				}
				if (context) {
					// Parent context has been found, use it for this partial
					var $parent = $('<div></div>');
					context.$view.append($parent);
				} else {
					// Stop the navigation there, invalid context reference
					traceLog('Invalid partial reference home "' + home + '" in not within the current context "' + $self.$current.$path + '"');
					return;
				}
			} else {
				$parent = $parent || $target;
			}

			// Sub module management
			if ($(this).attr('data-cascade') === 'true') {
				home += '/' + id;
			}

			$self.loadFragment(context, $self.$current.$transaction, home, id, {
				$parentElement: $parent,
				plugins: plugins,
				callback: callback
			});
		},

		/**
		 * Check the transaction corresponds to the given one.
		 * @param transaction : Object or number
		 */
		isSameTransaction: function (transaction, context) {
			return (transaction.$transaction === $self.transaction || transaction === $self.transaction) && (typeof (context || transaction).$unloaded === 'undefined');
		},

		/**
		 * Start a new navigation transaction and returns its identifier.
		 */
		newTransaction: function () {
			$self.transaction++;
			return $self.transaction;
		},

		failSafeContext: function (context, parent, transaction) {
			if (typeof context === 'function') {
				// Function generating the current object
				context = context($self);
			}
			context = context || {};

			// Propagate the hierarchy
			context.$parent = parent;
			context.$siblings = [];
			if (parent) {
				if (parent.$hindex === 0) {
					// Set the top most real plugin as '$main'
					context.$main = context;
				} else {
					context.$main = parent.$main;
				}
			}

			context.$session = $self.session;

			// Propagate the transaction
			$self.propagateTransaction(context, transaction);
			return context;
		},

		/**
		 * Propagate the transaction from current context to parent context.
		 * @param context : Context to update.
		 * @param transaction : Transaction identifier to propagate to the hierarchy.
		 */
		propagateTransaction: function (context, transaction) {
			context.$parent && $self.propagateTransaction(context.$parent, transaction);
			context.$transaction = transaction;
		},

		/**
		 * Initialize the given context by calling the optional 'initialize' function if provided, and with
		 * given parameters.
		 */
		initializeContext: function (context, transaction, callback, parameters) {
			// Initialize the module if managed
			if ((typeof context !== 'undefined') && (typeof context.$initializeTransaction === 'undefined')) {
				$(function () {
					if (!$self.isSameTransaction(transaction)) {
						return;
					}
					(typeof context.initialize === 'function') && $.proxy(context.initialize, context)(parameters);

					// Mark the context as initialized
					context.$initializeTransaction = transaction;
					callback && callback(context);
				});
			} else {
				callback && callback(context);
			}
		},

		/**
		 * Add a spin. Return the target element.
		 * @param $to Target container.
		 * @param sizeClass Optional Fontawesome size icon class such as : 'fa-3x'
		 * @param iconClass Optional icon class. If not defined, will be 'fa fa-spin fa-circle-o-notch'
		 * @return "$to" parameter.
		 */
		appendSpin: function ($to, sizeClass, iconClass) {
			var $spin = $('<i class="' + (iconClass || 'fa fa-circle-o faa-burst animated') + ' spin fade ' + (sizeClass || '') + '"></i>');
			$to.append($spin);
			setTimeout(function () {
				$spin.addClass('in');
				jQuery.contains(document, $spin[0]) && setTimeout(function () {
					$spin.addClass('text-warning');
					jQuery.contains(document, $spin[0]) && setTimeout(function () {
						$spin.removeClass('text-warning').addClass('text-danger');
					}, 7000);
				}, 1500);
			}, 1500);
			return $to;
		},

		/**
		 * Remove the spin from the node. Only direct spins are removed.
		 * @param $from Container to clean.
		 * @return '$from' parameter.
		 */
		removeSpin: function ($from) {
			$from.children('.spin').remove();
			return $from;
		},

		/**
		 * Initialize the application
		 */
		initialize: function () {
			this.isOldIE = $('html.ie-old').length;
			$.ajaxSetup({cache: false});

			$self.plugins.default = requirejs.s.contexts._.config.cascade;
			$.fn.htmlNoStub = $.fn.html;
			// Stub the HTML update to complete DOM with post-actions
			var originalHtmlMethod = $.fn.html;
			$.fn.extend({
				html: function () {
					if (arguments.length === 1) {
						// proceed only for identified parent to manage correctly the selector
						var id = this.attr('id');
						if ((id && id.substr(0, 2) !== 'jq') || this.is('[data-cascade-hierarchy]')) {
							applicationManager.debug && traceDebug('Html content updated for ' + id);
							var result = originalHtmlMethod.apply(this, arguments);
							$self.trigger('html', this);
							return result;
						}
					}
					return originalHtmlMethod.apply(this, arguments);
				}
			});

			// We can register the fragment listener now
			$(function () {
				var handleHash = function () {
					var hash = location.hash;
					if (hash && hash.indexOf('#/') === 0) {
						$self.load(hash.substr(2));
					} else if (hash === '') {
						$self.load('');
					}
				};
				$(window).hashchange(function () {
					handleHash();
				});
				handleHash();
			});
		},

		super: function (context, item) {
			return $self.closestFrom(context.$page, item) || $self.closestFrom(context.$parent, item);
		},

		/**
		 * Return the closest defined property or object in the hierarchy, and starting from the current context.
		 * @param  {object} context Current context.
		 * @param  {string} item    Property or function name.
		 * @return {object}         The first defined property or function in the hierarchy.
		 */
		closest: function (context, item) {
			var property = context[item];
			if (property && property instanceof jQuery) {
				// Non empty jQuery object
				return property.length ? property : $self.super(context, item);
			}
			return property || $self.super(context, item);
		},
		closestFrom: function (context, item) {
			if (context) {
				var owner = $self.closest(context, item);
				if (typeof owner === 'undefined' && context.$siblings) {
					owner = $self.closestFromSiblings(context.$siblings, item);
				}
				return owner;
			}
		},
		closestFromSiblings: function (siblings, item) {
			for (var index = 0; index < siblings.length; index++) {
				var owner = $self.closest(siblings[index], item);
				if (typeof owner !== 'undefined') {
					return owner;
				}
			}
		},

		isFinal: function (context) {
			return context.$final || ($self.plugins.html && $self.plugins.html.findNextContainer(context).length === 0);
		},

		finalize: function (context, parameters, transaction) {
			if ($self.isFinal(context)) {
				// There is no more implicit fragment to add, the context hierarchy is loaded
				// Commit the transaction
				$self.propagateTransaction(context, transaction);

				// Check the parameters change
				$self.handleInternalChange(context, parameters, transaction);
				$self.trigger('hash', context.$url + (parameters ? '/' + parameters : ''), context);
				return true;
			}
			$self.handleInternalChange(context, parameters, transaction);
			return false;
		},

		handleInternalChange: function (context, parameters, transaction) {
			if ((context.$parameters || '') !== (parameters || '')) {
				// Save the new parameters and trigger the change event
				context.$parameters = parameters;
				if ((typeof context.onHashChange) === 'function' && context.$initializeTransaction && context.$initializeTransaction !== transaction) {
					// Parameters are managed by the current plugin
					$.proxy(context.onHashChange, context)(parameters);
				}
			}
		},

		register: function (event, listener) {
			$self.callbacks[event] = $self.callbacks[event] || [];
			$self.callbacks[event].push(listener);
			return $self;
		},

		off: function (event) {
			$self.callbacks[event] = [];
			return $self;
		},

		/**
		 * Proceed all registered post DOM ready functions.
		 * @param {string} event    The event name to trigger.
		 * @param {object} data 	Optional data to attach to this event. Will the the current view as default.
		 * @param {object} context 	Optional context to attach to the event.
		 * @return selector
		 */
		trigger: function (event, data, context) {
			applicationManager.debug && traceDebug('Trigger event', event);
			var callbacks = $self.callbacks[event] || [];
			for (var i = 0; i < callbacks.length; i++) {
				if (typeof callbacks[i] === 'function') {
					callbacks[i](data || (context || $self.$context).$view, context);
				} else {
					traceLog('Expected function, but got "' + typeof callbacks[i] + '" : ' + callbacks[i]);
				}
			}
			return $self;
		}
	};
	return $self;
});
