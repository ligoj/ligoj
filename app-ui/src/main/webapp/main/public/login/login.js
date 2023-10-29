/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'jquery', 'i18n!main/public/login/nls/messages', 'bootstrap', 'material'
], function ($, messages) {
	/* jslint regexp: true */
	var mode = 'login';
	var current = {
		locked: false,
		target: null,
		resetMatcher: '#reset=([a-zA-Z0-9\\-]+)/([a-zA-Z0-9\\-]+)',
		recoveryMatcher: '#recovery(=([a-zA-Z0-9\\-]+))?',
		ajax: function (url, data, captcha) {
			var $submit = $('#submit').addClass('loading');
			current.locked = true;
			$.ajax({
				type: 'POST',
				url: url,
				dataType: 'json',
				contentType: captcha && 'application/json',
				headers: captcha && {
					captcha: $('#captcha').val()
				},
				data: data,
				cache: false,
				success: function (result) {
					current.success();
					if (result && result.success && result.redirect) {
						// Success login, use the provided redirection URL
						window.location.replace('//' + location.host + result.redirect + (current.target || '#/'));
					} else {
						window.location.replace('?' + mode);
					}
				},
				error: function (xhr) {
					current.handleError(xhr);
					captcha && current.refreshCaptcha();
				},
				complete: function () {
					// Release UI lock
					current.locked = false;
					$submit.removeClass('loading');
				}
			});
		},
		
		/**
		 * AJAX error management
		 */
		handleError: function(xhr) {
			if (xhr.status === 400) {
				if ((typeof xhr.responseText === 'string') && /^\{.*\}$/.exec(xhr.responseText) && JSON.parse(xhr.responseText).errors) {
					var error = JSON.parse(xhr.responseText).errors;
					if (error.password) {
						current.error(messages.error['password-complexity']);
						current.focusPassword();
					} else if (error.session) {
						// CAPTCHA failed
						current.error(messages.error.cookie);
						$('#captcha').val('').focus();
					} else if (error['password']) {
						current.error(messages.error['password-policy']);
						current.focusPassword();
					} else {
						// Other REST error
						current.error(messages.error.captcha);
						current.focusPassword();
					}
				} else {
					// Other server error
					current.error();
					current.focusPassword();
				}
			} else if (xhr.status === 403) {
				current.error(messages.error.connected);
				$('#username').val('').focus();
			} else if (xhr.status === 503) {
				current.error(messages.error.mail);
			} else {
				// Other network error
				current.error();
				current.focusPassword();
			}
		},
		focusPassword: function () {
			$('#password:visible').focus();
		},
		error: function (message) {
			current.clear();
			$('#error-message').removeClass('hidden').html((message && messages.error[message]) || message || messages.error[mode] || messages.error.technical);
		},
		info: function (message) {
			current.clear();
			$('#info-message').removeClass('hidden').html(message);
		},
		success: function (message) {
			current.clear();
			$('#success-message').removeClass('hidden').html(messages['success-' + message] || messages['success-' + mode]);
		},
		clear: function () {
			$('.alert.status').addClass('hidden');
		},
		login: function () {
			current.ajax('login', {
				username: $('#username').val().toLowerCase(),
				password: $('#password').val()
			});
		},
		reset: function () {
			current.ajax('rest/service/password/reset/' + $('#username').val().toLowerCase(), JSON.stringify({password: $('#password').val(), token: current.token}), true);
		},
		recovery: function () {
			current.ajax('rest/service/password/recovery/' + $('#username').val().toLowerCase() + '/' + $('#mail').val().toLowerCase(), undefined, true);
		},
		refreshCaptcha: function () {
			return $('#captcha_img').attr('src', 'captcha.png?' + new Date().getTime());
		},
		switchMode: function (oldMode) {
			$('.card-title').text(messages['title-' + mode]);
			var message = messages['message-' + mode];
			if (message) {
				$('#info-message').html(message).removeClass('hidden');
			} else {
				$('#info-message').addClass('hidden');
			}
			$('#submit').find('span').html(messages['submit-' + mode]);
			if (mode !== oldMode) {
				$('.page-header').removeClass('recovery').removeClass('login').removeClass('reset').addClass(mode);
			}
			$('.status').addClass('hidden');
			$('[class*="show-"] input').removeAttr('required');
			$('.show-' + mode + ' input').attr('required', 'required');
			var from = window.location.search && window.location.search.substring(1);
			from && current[from === 'concurrency' ? 'error' : 'success'](from);
			if (mode !== 'login') {
				current.refreshCaptcha();
			}

			// Focus and activation
			var matcher = current[mode + 'Matcher'];
			var $user = $('#username');
			if (matcher && window.location.hash.match(matcher)[2]) {
				$user.val(window.location.hash.match(matcher)[2]);
			}
			if (mode === 'reset') {
				$user.attr('readonly', 'readonly').attr('disabled', 'disabled').removeAttr('required');
				current.token = window.location.hash.match(matcher)[1];
				$('label[for="password-confirm"').after('<div class="form-group"><input type="password" class="form-control password" id="password-confirm" required="required" maxlength="50"></div>');

				// Password validation
				$('#password').on('keyup', function () {
					var $help = $('#password').closest('.input-group').find('span');
					var value = $(this).val();
					$help.removeClass('text-success text-warning');
					value && $help.addClass(current.validatePassword(value) ? 'text-success' : 'text-warning');
					$('#password-confirm').trigger('keyup');
				}).on('input', function () {
					var value = $(this).val();
					value && current.validationError(this, current.validatePassword(value) ? '' : messages.error['password-complexity-validation']);
				});

				$('#password-confirm').on('keyup', function () {
					var $help = $('#password-confirm').closest('.input-group').find('span');
					var value = $(this).val();
					var otherVal = $('#password').val();
					$help.removeClass('text-success text-warning');
					value && otherVal && $help.addClass(current.validateConfirmPassword(value, otherVal) ? 'text-success' : 'text-warning');
				}).on('input', function () {
					var value = $(this).val();
					var otherVal = $('#password').val();
					value && otherVal && current.validationError(this, current.validateConfirmPassword(value, otherVal) ? '' : messages.error.password);
				});
				$(function () {
					$('#password').focus();
				});
			} else {
				$user.removeAttr('readonly').removeAttr('disabled');
				$(function () {
					$user.focus();
				});
			}

			// Clean the URL
			if (current.target === null && window.location.hash) {
				window.location.hash = '#' + mode;
			}
		},
		localize: function () {
			$('label[for]').each(function () {
				var id = $(this).attr('for');
				$('#' + id).attr('placeholder', messages[id]);
				$(this).closest('.input-group').find('span').attr('title', messages['help-' + id]).tooltip({container: 'body'});
			});
			$('#link-back').text(messages.back);
			$('#link-recover').text(messages.recover);
		},
		validatePassword: function (value) {
			return value && /[A-Z]/.exec(value) && /[a-z]/.exec(value) && /[0-9]/.exec(value);
		},
		validateConfirmPassword: function (value, otherVal) {
			return value && otherVal && value === otherVal;
		},
		validationError: function (elt, error) {
			if ((typeof elt.setCustomValidity) === 'function') {
				elt.setCustomValidity(error);
			} else {
				$('#error-message').html(messages['message-' + mode] + '<br/>' + error).removeClass('hidden');
			}
		},
		initialize: function () {
			$.material.init();
			// i18n, alt, title and labels
			current.localize();
			//  Activate the Tooltips
			$('[data-toggle="tooltip"], [rel="tooltip"]').tooltip();

			$('#link-recover').click(function () {
				var oldMode = mode;
				mode = 'recovery';
				window.location = '//' + location.host + location.pathname + '#recovery' + ($('#username').val() ? '=' + $('#username').val() : '');
				window.location.search || current.switchMode(oldMode);
			});

			$('#captcha_img').on('load', function () {
				$('#captcha_img').removeClass('hidden');
			});

			// AJAX submit
			$('#login').submit(function () {
				if (current.locked === false && $('.text-warning').length === 0 && $('input[required]').filter(function () {
					return $(this).val() === '';
				}).length === 0) {
					current.info(messages.validating);
					current[mode]();
				}
				return false;
			});

			// Configure the current mode
			if (window.location.hash.match(current.resetMatcher)) {
				current.target = null;
				mode = 'reset';
			} else if (window.location.hash.match(current.recoveryMatcher)) {
				current.target = null;
				mode = 'recovery';
			} else if (window.location.hash) {
				current.target = window.location.hash;
				mode = 'login';
			}
			current.switchMode('login');
		}
	};
	current.initialize();
	return current;
});
