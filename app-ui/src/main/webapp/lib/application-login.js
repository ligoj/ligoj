/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
var $ = window.jQuery;
var applicationManager = {

	/**
	 * Initialize AMD dependencies and configuration.
	 */
	initialize: function () {
		var cache = !this.debug && location.hostname !== 'localhost' && requirejs.s.contexts._.config.urlArgs('', '').substring(1) !== 'bust=${project.version}';
		var urlArgs = cache ? null : 'bust=' + new Date().getTime();
		require.config({
			urlArgs: cache ? requirejs.s.contexts._.config.urlArgs : function (id, url) {
				return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
			},
			waitSeconds: 20,
			paths: {
				'main': '../main',
				'root': '.',

				'bootstrap': 'bootstrap/bootstrap',
				'material': 'material-design/material',
				'login': '../main/public/login/login'
			},
			shim: {
				'bootstrap': ['jquery'],
				'material': ['jquery']
			}
		});
		require(['login']);
	}
};
applicationManager.initialize();
