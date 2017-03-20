define(function () {
	var current = {

		user: null,

		/**
		 * Manage internal navigation.
		 */
		onHashChange: function (parameter) {
			current.user = parameter || current.$session.userName;
			current.loadUser(current.user);
			if (current.$session.userName === current.user) {
				_('change-password').removeClass('hide');
			} else {
				_('change-password').addClass('hide');
			}
		},

		changePassword: function () {
			validationManager.reset(_('_change'));

			// validation
			var newPassword = _('new-password').val();
			var newPasswordConfirm = _('password-confirm').val();
			var valid = true;
			if (newPassword !== newPasswordConfirm) {
				valid = false;
				validationManager.addError($('#new-password,#password-confirm'), {
					rule: 'password'
				}, 'password');
			}

			// (?=.*[A-Z])(?=.*\\W)(?=.*[0-9])(?=.*[a-z]).{8}.*
			if (!newPassword.match('((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9@#$%_\\-/:!§*£=+|{}\\[\\]\\?<>;\'&]{8,50})')) {
				valid = false;
				validationManager.addError(_('new-password'), {
					rule: 'password-complexity-validation'
				}, 'password');
			}
			if (valid) {
				$.ajax({
					type: 'PUT',
					url: REST_PATH + 'ldap/password',
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify({
						newPassword: _('new-password').val(),
						password: _('password').val()
					}),
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.updated)(current.$messages.menu.profile));
						_('_change').modal('hide');
					}
				});
			}
		},

		/**
		 * Load a user
		 */
		loadUser: function (id) {
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'ldap/user/' + id,
				success: function (data) {
					_('login').val(data.id);
					_('firstName').val(data.firstName);
					_('lastName').val(data.lastName);
					_('mail').val(data.mails);
					_('localid').val(data.localId);
					_('department').val(data.department);
					_('company').val(data.company);
					_('groups').attr('rows', data.groups.length).val(data.groups.join('\n'));

					// Loacked account management
					if (data.disabled) {
						_('locked').removeClass('hidden');
						_('locked-since').val(moment(data.disabled).format(formatManager.messages.shortdateMomentJs));
					} else {
						_('locked').addClass('hidden');
					}
				}
			});
		},
		initialize: function (parameters) {
			_('change-password').on('click', function () {
				require(['i18n!main/public/login/nls/messages', 'text!main/ldap/user/change-password.html'], function (messages, template) {
					$.extend(current.$messages, messages);
					_('_password-popup-container').html(Handlebars.compile(template)(current.$messages));
					_('_change').on('show.bs.modal', function () {
						validationManager.reset($(this));
					}).on('shown.bs.modal', function () {
						_('password').focus();
					}).modal('show');
					_('save').on('click', current.changePassword);
				});
			});
			validationManager.mapping.newPassword = 'new-password';
			current.onHashChange(parameters);
		}
	};
	return current;
});
