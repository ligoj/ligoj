/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'i18n!error/nls/error-messages', 'cascade'
], function (errorMessages, $cascade) {
	/* jslint regexp: true */
	var current = {
		lastAjaxReceive: {},
		lastAjaxSend: {},
		loginMessages: null,
		isLoginPrompBeingDisplayed: false,

		/**
		 * Return error messages.
		 */
		getMessages: function () {
			return errorMessages;
		},

		/**
		 * Indicates the text is a maybe a JSON string.
		 * @param text the JSON text (or not).
		 * @return true if is a JSON text.
		 */
		isJsonText: function (text) {
			return (typeof text === 'string') && text.length > 0 && /^\{.*\}$/.exec(text);
		},

		getTechnicalCause: function (errorObj) {
			if (errorObj && errorObj.message) {
				return '<span class="toggle-visibility">&nbsp;<b>[...]</b><span class="toggle-visibility-content">' + current.getTechnicalCauseText(errorObj) + '</span></span>';
			}
			return '';
		},

		getTechnicalCauseText: function (errorObj) {
			if (errorObj && errorObj.message) {
				return '<br/>&nbsp;&gt;&nbsp;' + errorObj.message + (errorObj.cause ? current.getTechnicalCauseText(errorObj.cause) : '');
			}
			return '';
		},

		manageScriptError: function (message, url, line) {
			traceLog('Uncaught error : ' + message + ':' + line, url + ':' + line);
			notifyManager && notifyManager.notifyDanger(message + '<br/>URL : ' + url + '<br/>Line : ' + line, errorMessages.internal);
		},
		manageSecurityError: function (url) {
			notifyManager && notifyManager.notifyDanger(errorMessages['error403-details'], errorMessages.error403);
			traceLog('Not authorized', url);
		},

		login: function () {
			_('_login_save').disable().off('click');
			_('_login_msgbox').removeClass('label-important').addClass('label-info').text(current.loginMessages.validating).show();
			$.ajax({
				type: 'POST',
				url: 'login',
				dataType: 'json',
				data: {
					username: _('_login_username').val(),
					password: _('_login_password').val()
				},
				success: function (data) {
					if (data.success) {
						_('_login').modal('hide').remove();
						notifyManager.clear();
						current.isLoginPrompBeingDisplayed = false;
						notifyManager.notify(current.loginMessages['success-login']);
						location.reload();
					}
				},
				error: function () {
					_('_login_msgbox').removeClass('label-info').addClass('label-important').text(current.loginMessages['error-login']);
					_('_login_password').trigger('focus');
				},
				complete: function () {
					_('_login_save').enable().on('click', current.login);
				}
			});
		},

		isLoginPrompDisplayed: function () {
			return (_('_login').length !== 0 && $('button[data-target="#_login"]').length !== 0) || current.isLoginPrompBeingDisplayed;
		},

		/**
		 * Show the authentication requirement and load the login form for the popup.
		 */
		showAuthenticationAlert: function () {
			if (!current.isLoginPrompDisplayed()) {
				current.isLoginPrompBeingDisplayed = true;
				require([
					'text!main/public/login/login-popup.html', 'i18n!main/public/login/nls/messages'
				], function (html, messages) {
					current.loginMessages = messages;
					$('body').first().append(Handlebars.compile(html)(messages));
					var $popup = _('_login');
					$cascade.trigger('html', $popup);
					$popup.on('show', function () {
						$('.modal').not($popup).modal('hide');
						_('_login_msgbox').removeClass('label-important').removeClass('label-info').hide();
					}).on('shown', function () {
						_('_login_username').trigger('focus');
					}).on('hidden', function () {
						_('_login').remove();
					});
					_('_login_save').enable().on('click', current.login);
					notifyManager.notify(errorMessages['error401-details'], errorMessages.error401, 'error', 'toast-top-right', -1);
				});
			}
		},

		/**
		 * Return only relative path from the related URL.
		 */
		_trimUrl: function (xhr) {
			var url = xhr.settings && xhr.settings.url;
			if (url.indexOf('?') >= 0) {
				url = xhr.settings.url.substr(0, url.indexOf('?'));
			}
			return url;
		},

		/**
		 * Manage a non 200 OK status code : 0,4xx,5xx,...
		 */
		manageAjaxError: function (event, xhr, textStatus, errorThrown) {
			// Initialize logs
			current.lastAjaxReceive = {
				event: event,
				xhr: xhr,
				errorThrown: errorThrown,
				textStatus: textStatus
			};
			if (notifyManager === null) {
				return;
			}
			var errorObj;
			if (xhr.status === 400) {
				current.manageBadRequestError(xhr.responseText, false, true);
			} else if (xhr.status === 403) {
				// Permission denied handler
				current.manageSecurityError();
			} else if (xhr.status === 401) {
				// Authentication is required
				current.showAuthenticationAlert();
			} else if (xhr.status === 404) {
				if (current.isJsonText(xhr.responseText)) {
					// A JSON formated response from business server
					errorObj = JSON.parse(xhr.responseText);
					if (errorObj.code === 'entity') {
						notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-entity'])(errorObj.message), errorMessages['error404-data-title']);
						return;
					}
					if (errorObj.code === 'data') {
						notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-data'])(errorObj.message), errorMessages['error404-data-title']);
						return;
					}
				}
				// Resource location
				notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-details'])(current._trimUrl(xhr)), errorMessages.error404);
			} else if (xhr.status === 405) {
				// Resource location
				notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-details'])(current._trimUrl(xhr)), errorMessages.error404);
			} else if (xhr.status === 412) {
				// Integrity like exception
				errorObj = JSON.parse(xhr.responseText);
				var integrityMessage = errorObj.message.split('/');
				if (errorObj.code === 'integrity-foreign') {
					// `assignment`, CONSTRAINT `FK3D2B86CDAF555D0B`
					// FOREIGN KEY (`project`)
					notifyManager.notify(Handlebars.compile(errorMessages['error412-foreign-details'])({from: integrityMessage[0], to: integrityMessage[1]}), errorMessages.error412, 'warning');
				} else if (errorObj.code === 'integrity-unicity') {
					notifyManager.notify(Handlebars.compile(errorMessages['error412-unicity-details'])({entry: integrityMessage[0], name: integrityMessage[1]}), errorMessages.error412, 'warning');
				} else {
					// Not managed integrity error
					notifyManager.notify(errorMessages['error412-unknown-details'], errorMessages.error412, 'warning');
				}
			} else if (xhr.status === 415) {
				// Invalid media type
				notifyManager.notifyDanger(errorMessages['error415-details'], errorMessages.error415);
			} else if (xhr.status === 500) {
				// Business side error issue
				if (current.isJsonText(xhr.responseText)) {
					// A JSON formated response from business server
					current.manageBusinesSideError(JSON.parse(xhr.responseText), true);
				} else {
					// An unknown business/web server error
					notifyManager.notify(errorMessages.error500, null, 'error');
				}
			} else if (xhr.status === 503) {
				// Server resource issue
				// A required resource cause the service unavailable
				if (current.isJsonText(xhr.responseText)) {
					// A JSON formated response from business server
					errorObj = JSON.parse(xhr.responseText);
					notifyManager.notifyDanger(errorMessages[errorObj.code] + current.getTechnicalCause(errorObj.cause), errorMessages.error503);
				} else {
					// An unknown business/web server error
					notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-details'])(current._trimUrl(xhr)), errorMessages.error503);
				}
			} else if (xhr.status > 500) {
				notifyManager.notifyDanger(errorMessages['error' + xhr.status +'-details'], errorMessages['error' + xhr.status] || errorMessages.error500);
			} else if (xhr.status === 200 || (xhr.status === 0 && xhr.statusText === 'n/a')) {
				// JavaScript error
				traceLog('Javascript error (' + xhr.status + ') : ' + xhr.responseText, errorThrown);
				notifyManager.notifyDanger(String(errorThrown));
			} else if (xhr.status === 0) {
				if (xhr.statusText !== 'abort') {
					// Off-line mode notification
					notifyManager.notify(errorMessages.error0);
				}
			} else if (xhr.responseText) {
				// Technical error from business server
				notifyManager.notifyDanger(errorMessages.message + '&nbsp;:&nbsp;' + xhr.responseText, errorMessages.errorxxx + ' (' + xhr.status + ')');
				traceLog('Unexpected error (' + xhr.status + ') : ' + xhr.responseText, errorThrown);
			} else {
				// Unexpected error : connection issue for sure...
				notifyManager.notifyDanger(errorMessages['business-down'], errorMessages.errorxxx + ' (' + xhr.status + ')');
				traceLog('Network issue (' + xhr.status + ') : ' + xhr.responseText, errorThrown);
			}
		},

		manageBadRequestError: function (text, notify, ui) {
			if (current.isJsonText(text)) {
				// A JSR303 Validation Error a JSON or technical bad request management
				var jsonError = JSON.parse(text);
				if (jsonError.code) {
					// A technical bad request
					return current.manageBusinesSideError(jsonError, notify, ui);
				}
				// A true JSR303 Validation Error with UI
				return validationManager.validate(jsonError.errors, notify, ui);
			}
			// A unknown error
			notifyManager.notify(text);
		},

		/**
		 * Business side error : business error, or any technical related issues occurred at the business
		 * server level.
		 * @param {boolean} notify When true, the message will be displayed in the UI.
		 * @return The localized message.
		 */
		manageBusinesSideError: function (errorObj, notify) {
			var alertType = notifyManager.getTypeFromBusiness(errorObj.code);

			// First translate from user's scope
			var i18nMessage = (errorObj.message && ($cascade.$messages.error[errorObj.message] || errorMessages[errorObj.message] || errorObj.message)) || errorMessages.errorxxx;
			if (i18nMessage && errorObj.parameters && errorObj.parameters.length && i18nMessage.indexOf('{{') !== -1) {
				for (var index = 0; index < errorObj.parameters.length; index++) {
					var parameterKey = errorObj.parameters[index];
					var i18nParameter = $cascade.$messages.error[parameterKey] || $cascade.$messages[parameterKey] || errorMessages[parameterKey];
					if (i18nParameter) {
						errorObj.parameters[index] = i18nParameter;
					}
				}
				i18nMessage = Handlebars.compile(i18nMessage)(errorObj.parameters);
			}
			if (notify) {
				if (errorObj.code === 'business') {
					notifyManager.notify(i18nMessage, null, alertType);
				} else {
					notifyManager.notify(i18nMessage + current.getTechnicalCause(errorObj.cause), errorMessages[errorObj.code], alertType);
				}
			}
			return i18nMessage;
		},

		initialize: function () {
			// Trigger cascade on start / stop
			$(document).ajaxSend(function (event, xhr, settings) {
				xhr.settings = settings;
				current.lastAjaxSend = {
					event: event,
					xhr: xhr,
					settings: settings
				};
			}).ajaxSuccess(function (event, xhr, settings) {
				// Initialize logs
				current.lastAjaxReceive = {
					event: event,
					xhr: xhr,
					settings: settings
				};
			}).ajaxError(function (event, xhr, textStatus, errorThrown) {
				current.manageAjaxError(event, xhr, textStatus, errorThrown);
			}).ajaxStart(function () {
				// Add loading indicator
				$cascade.appendSpin($('body'), '" id="loading', 'fas fa-spin fa-circle-notch');
			}).ajaxStop(function () {
				_('loading').remove();
			});

			requirejs.onError = function (err) {
				current.manageRequireJsError(err);
			};
		},

		/**
		 * Manage RequireJS error.
		 */
		manageRequireJsError: function (err) {
			// Never cache errors
			if (err.requireModules) {
				current.undef(err.requireModules);
				if (current.ignoredRequireModules[err.requireModules[0]]) {
					// Ignore this AMD error, already handled
					return;
				}
			}
			if (err.xhr && err.xhr.status === 401) {
				current.showAuthenticationAlert();
			} else if (err.requireType === 'timeout' && err.requireModules) {
				if (!current.isLoginPrompDisplayed()) {
					notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-timeout-details'])(err.requireModules[0]), errorMessages['error404-timeout']);
				}
			} else if (err.requireType === 'scripterror' && err.requireModules) {
				if (!current.isLoginPrompDisplayed()) {
					notifyManager.notifyDanger(Handlebars.compile(errorMessages['error404-scripterror-details'])(err.requireModules[0]), errorMessages['error404-scripterror']);
				}
			} else if (err.requireModules && err.requireModules[0] && err.requireModules[0].startsWith('text!') && err.requireModules[0].endsWith('.html')) {
				// Broken AMD link, moved page,... add a 404 like message and move to home page
				if (err.requireModules[0] === 'text!main/home/home.html') {
					// Broken page is the home page, no redirection possible to avoid loop
					traceLog('Technical error', err.stack);
					throw err;
				} else {
					// Broken page is not the home page, fail-safe redirection
					notifyManager.notify(Handlebars.compile(errorMessages['error404-redirected-details'])({page: window.location.hash}), Handlebars.compile(errorMessages['error404-redirected'])({icon: '<i class="fas fa-2 fa-map-signs text-danger"></i>&nbsp;'}), 'warning', 'toast-top-right');
					window.location.hash = '#/';
				}
			} else {
				// Not managed AMD error
				traceLog('Technical error', err.stack);
				throw err;
			}
		},
		
		ignoredRequireModules : {},
		
		ignoreRequireModuleError: function(modules) {
			if ($.isArray(modules)) {
				for (var index = 0; index < modules.length; index++) {
					current.ignoredRequireModules[modules[index]] = true;
				}
			}
		},

		/**
		 * Clear error state for given modules.
		 */
		undef: function (modules) {
			for (var i = 0; i < modules.length; i++) {
				require.undef(modules[i]);
			}
		}
	};
	current.initialize();

	// Make global
	window.errorManager = current;
	return current;
});
