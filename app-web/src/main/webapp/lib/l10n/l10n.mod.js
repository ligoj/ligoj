define(function () {
	var localeManager = {
		requireLocale: null,
		requireLanguage: null,
		navigatorLocale: null,
		navigatorLocales: [],
		initialize: function (defaultLocale) {
			localeManager.requireLocale = typeof navigator === 'undefined' ? (defaultLocale || 'root') : (navigator.language ||
				navigator.userLanguage || (defaultLocale || 'root')).toLowerCase();
			localeManager.navigatorLocale = localeManager.requireLocale === 'root' ? 'en' : localeManager.requireLocale;

			var parts = localeManager.navigatorLocale.split('-');
			var current = '';
			for (var i = 0; i < parts.length; i++) {
				current += (current ? '-' : '') + parts[i];
				localeManager.navigatorLocales.unshift(current);
			}
			localeManager.navigatorLocales.push();
			localeManager.requireLanguage = localeManager.requireLocale && localeManager.requireLocale.split('-')[0];
		},

		/**
		 * Return the nearest locale suiting to the local of the navigator.
		 * @param supportedLocales collection of supported locales of requesting tool.
		 * @param defaultLocale [optional] the default locale returned when no supported locale matched the navigator language.
		 */
		findNearestLocale: function (supportedLocales, defaultLocale) {
			var i;
			for (i = 0; i < supportedLocales.length; i++) {
				if (localeManager.navigatorLocales[supportedLocales[i].toLowerCase()]) {
					return supportedLocales[i];
				}
			}

			// Fail safe case
			return defaultLocale;
		}
	};
	localeManager.initialize();
	window.localeManager = localeManager;
	return localeManager;
});