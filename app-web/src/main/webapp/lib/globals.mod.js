/** const */
var REST_MATCH_PATH = 'rest';
var REST_PATH = REST_MATCH_PATH + '/';
var USECASE_PATH = 'main/';

/** globals to remove */
var notify = null;
var validationManager = null;
var errorManager = null;
var formatManager = null;
var notifyManager = null;
var localeManager = null;
var securityManager;
var dateRangePickerManager = null;
var momentManager;
var moment;

/**
 * Log info function.
 */
function traceLog(msg, context) {
	if (navigator.appVersion.indexOf('MSIE 7.') !== -1) {
		// FIX IE7, no format available
		if (typeof context === 'undefined') {
			window.console && window.console.log(msg);
		} else {
			window.console && window.console.log(msg + ' ' + (context || this));
		}
	} else if (typeof context === 'undefined') {
		window.console && window.console.log('%s', msg);
	} else {
		window.console && window.console.log('%s: %o', msg, context || this);
	}
	return this;
}

/**
 * Log debug function.
 */
function traceDebug(msg, context) {
	return window.console && applicationManager.debug && traceLog(msg, context);
}

/**
 * Shorthand of $(#id) and fastest.
 */
function _(id) {
	return $(document.getElementById(id));
}

/**
 * Protect window.console method calls, e.g. console is not defined on IE unless dev tools are open,
 * and IE doesn't define console.debug
 */
(function () {
	if (!window.console) {
		window.console = {};
	}
	// union of Chrome, FF, IE, and Safari console methods
	var m = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'profile', 'profileEnd', 'dirxml', 'assert', 'count', 'markTimeline', 'timeStamp', 'clear'];
	var i;
	// define undefined methods as noops to prevent errors
	for (i = 0; i < m.length; i++) {
		if (!window.console[m[i]]) {
			window.console[m[i]] = $.noop;
		}
	}

	/**
	 * Register some basic utilities.
	 */
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function (val) {
			return $.inArray(val, this);
		};
	}
	if (typeof String.prototype.endsWith !== 'function') {
		String.prototype.endsWith = function (suffix) {
			return this.indexOf(suffix, this.length - suffix.length) !== -1;
		};
	}
	if (typeof String.prototype.startsWith !== 'function') {
		String.prototype.startsWith = function (str) {
			return this.indexOf(str) === 0;
		};
	}

	/**
	 * Register some basic utilities.
	 */
	String.prototype.capitalize = function () {
		return this.replace(/(?:^|\s)\S/g, function (a) {
			return a.toUpperCase();
		});
	};

	// Function transforming "sample-property" to "sampleProperty"
	String.prototype.toProperty = function () {
		return this.replace(/(?:-|\s)\S/g, function (a) {
			return a.toUpperCase();
		}).replace(/[\-\s]/g, '');
	};

	// Function to get the Max value in Array
	Array.max = function (array) {
		return Math.max.apply(Math, array);
	};

	// Function to get the Min value in Array
	Array.min = function (array) {
		return Math.min.apply(Math, array);
	};

	Array.maxAuto = function (array) {
		return Array.max(array) || Array.maxSparse(array);
	};
	Array.minAuto = function (array) {
		return Array.min(array) || Array.minSparse(array);
	};
	Array.maxSparse = function (array) {
		var narray = [];
		var i;
		for (i = 0; i < array.length; i++) {
			if (array[i]) {
				narray.push(array[i]);
			}
		}
		return Math.max.apply(Math, narray);
	};
	Array.minSparse = function (array) {
		var narray = [];
		var i;
		for (i = 0; i < array.length; i++) {
			if (array[i]) {
				narray.push(array[i]);
			}
		}
		return Math.min.apply(Math, narray);
	};
	Array.binarySearch = function (array, find) {
		var low = 0;
		var high = array.length - 1;
		var i;
		while (low <= high) {
			i = Math.floor((low + high) / 2);
			if (this[i] < find) {
				low = i + 1;
			} else if (this[i] > find) {
				high = i - 1;
			} else {
				return i;
			}
		}
		return null;
	};
})();

/**
 * Global error handler.
 */
window.onerror = function (message, url, line) {
	if (typeof errorManager === 'undefined' || errorManager === null) {
		traceLog('Uncaught error : ' + message + ':' + line);
	} else {
		errorManager.manageScriptError(message, url, line);
	}
	return false;
};
