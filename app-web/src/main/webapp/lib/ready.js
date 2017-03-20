/**
 * @license ready 0.0.1 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/domReady/LICENSE
 */
/*jslint */
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */

define(function () {
	'use strict';

	/** START OF PUBLIC API **/

	/**
	 * Registers a callback for DOM ready. If DOM is already ready, the
	 * callback is called immediately.
	 * @param {Function} callback
	 */
	function ready(callback) {
		callback('');
		return ready;
	}

	ready.version = '0.0.1';

	/**
	 * Loader Plugin API method
	 */
	ready.load = function (name, req, onLoad, config) {
		if (config.isBuild) {
			onLoad(null);
		} else {
			ready(onLoad);
		}
	};

	/** END OF PUBLIC API **/

	return ready;
});
