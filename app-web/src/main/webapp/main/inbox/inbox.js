define(['cascade'], function ($cascade) {
	var current = {

		/**
		 * Page cursor
		 * @type {Number}
		 */
		page: 0,

		// No update mode for now
		currentId: null,

		initialize: function () {
			var $inbox = current.$main.$view.find('.bs-inbox').addClass('inbox-main');
			var $trigger = $inbox.find('.inbox-trigger');

			// Popover events
			$trigger.on('shown.bs.popover', function () {
				// Load messages from the server
				$inbox.find('.message-title').find('.form-control').focus();
			}).on('show.bs.popover', function () {
				current.page = 0;
				current.loadMessages($inbox.removeClass('inbox-detail').removeClass('inbox-new').addClass('inbox-main'), 0);
			});

			// Inbox internal navigation
			$inbox.on('click', '.message-w', function (e) {
				// Switch to the detailed message view
				if ($(e.target).closest('.avatar').length === 0) {
					$(this).addClass('message-detail').removeClass('unread') && $inbox.addClass('inbox-detail').removeClass('inbox-new').removeClass('inbox-main');
				}
			}).on('click', '.message-back', function () {
				// Back to the short message
				current.back($inbox);
			}).on('click', '.more a', function () {
				// New message mode
				current.page++;
				current.loadMessages($inbox, current.page);
			}).on('click', '.new-message', function () {
				// New message mode
				$inbox.removeClass('inbox-detail').removeClass('inbox-main').addClass('inbox-new').find('.message-w').removeClass('message-detail');
			}).on('keyup', '.message-title input', function (e) {
				// Reload filtered messages from the server with page offset reset
				current.page = 0;
				(String.fromCharCode(e.keyCode).match(/\w/) || e.keyCode === 8 || e.keyCode === 46) && current.loadMessages($inbox, 0);
			}).on('submit', '.message-new', function () {
				current.submit($inbox);
			}).on('change', '#_message-to', function () {
				current.updateAudience($inbox);
			}).on('change', '#_message-to-type', function () {
				// Target type is updated, update the select 2 type
				current.updateTargetSelect2($inbox, $(this).val());
			});

			// Load the messages if the popover is displayed
			if ($inbox.find('.popover').length) {
				// Already available
				current.loadMessages($inbox.addClass('inbox-main'), 0);
			}
		},

		/**
		 * Submit a new message.
		 * @param  {jquery} $inbox The inbox component.
		 */
		submit: function ($inbox) {
			// New message
			var targetType = _('_message-to-type').val();
			var target = _('_message-to').val();
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'message',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify({value: _('_message').val(), targetType: targetType, target: target}),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.notifications.sent)([
						current.toAvatar(targetType, target),
						target
					]));

					// Clear the message
					_('_message').val('');

					// Go back to the main view
					current.back($inbox);
				}
			});
		},

		/**
		 * Update the audience from the current selection.
		 * @param  {jquery} $inbox The inbox component.
		 */
		updateAudience: function ($inbox) {
			// Select 2 target is updated, get the audience
			var type = _('_message-to-type').val();
			var target = _('_message-to').val();
			var $audience = $inbox.find('.message-new .audience');
			if (target && type !== 'user') {
				// Reset the audience UI
				$cascade.appendSpin($audience.removeClass('hidden').find('span').empty(), null, 'fa fa-refresh faa-spin animated');
				$.ajax({
					url: REST_PATH + 'message/audience/' + encodeURIComponent(type) + '/' + encodeURIComponent(target),
					dataType: 'json',
					contentType: 'application/json',
					success: function (audience) {
						$cascade.removeSpin($audience.find('span')).empty().html(audience);
					}
				});
			} else {
				// Empty selection, hide audience
				$audience.addClass('hidden');
			}
		},

		/**
		 * Return to the main inbox view
		 * @param  {jquery} $inbox The inbox component.
		 */
		back: function ($inbox) {
			$inbox.removeClass('inbox-detail').removeClass('inbox-new').addClass('inbox-main').find('.message-w').removeClass('message-detail');
		},

		/**
		 * Load messages from the server and add them to th UI. Data will be filtered with the optional filter.
		 * @param  {jquery} $inbox The inbox component.
		 * @param  {integer} page Page number.
		 * @param  {function} callback Optional callback when UI is updated.
		 */
		loadMessages: function ($inbox, page, callback) {
			var needPopover = $inbox.find('.message-back').length === 0;

			// Load the messages
			var filter = $inbox.find('.message-title input').val();
			var $more = $inbox.find('.more a').addClass('hidden');
			$cascade.appendSpin($more.closest('.more'), null, 'fa fa-refresh faa-spin animated');
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'message/my?start=' + (page * 10) + '&length=10&order[0][column]=0&columns[0][name]=id&order[0][dir]=desc' + (filter ? '&search[value]=' + encodeURIComponent(filter) : ''),
				success: function (messages) {
					needPopover && current.initializePopover($inbox);
					var $content = $inbox.find('.popover-content').find('.messages');
					if (page === 0) {
						// Empty the messages list since the messages are appended
						$content.empty();
					}
					current.appendMessages($content, messages, page);

					// Also set the counter UI to 0 and update the popover position
					$cascade.session.userSettings.unreadMessages = 0;
					current.$main.updateMessageCounter();
					$cascade.removeSpin($more.closest('.more'));
					if (messages.length === 10) {
						// No more messages
						$more.removeClass('hidden');
					}
					callback && callback(messages);
				}
			});
		},

		/*
		 * Initialize the popover cotent from the template.
		 * @param  {jquery} $inbox The inbox component.
		 */
		initializePopover: function ($inbox) {
			// Add the title
			var $popover = $inbox.find('.popover');

			// Fill the popover
			$popover.find('.popover-title').remove();
			$popover.find('.popover-content').remove();
			$popover.html($(current.$view.html()));

			// Prepare the UI of the new view
			_('_message-to-type').select2().trigger('change');
		},

		toText: function (data) {
			return data.label || data.name || data.id || data;
		},

		toLink: function (type, data, text) {
			if (type === 'user') {
				var id = data ? data.id || data : null;
				return id && ' <a href="#/ldap/user/' + id + '">' + current.$main.getFullName(data) + '</a>';
			}
			var href = current.toHref(type, data);
			return href ? ' <a href="' + href + '">' + text + '</a>' : (' ' + text);
		},

		toHref: function (type, data) {
			var id = data || data.id;
			switch (type) {
				case 'company':
					return id && '#/ldap/home/company=' + encodeURIComponent(id);
				case 'group':
					return id && '#/ldap/home/group=' + encodeURIComponent(id);
				case 'project':
					return id && '#/home/project/' + id;
				case 'user':
					return id && '#/ldap/user/' + id;
				default:
					return '';
			}
		},
		/**
		 * Icon of corresponding message typ.
		 */
		toAvatar: function (type, data, title, content) {
			var href = null;
			var style;
			title = title || current.toText(data);
			switch (type) {
				case 'company':
					style = 'danger';
					href = data && data.id && '#/ldap/home/company=' + encodeURIComponent(data.id);
					break;
				case 'node':
					var fragments = (data.id || data || '::').split(':');
					var baseUrl = 'main/plugin/' + fragments[1] + '/' + fragments[2] + '/img/' + fragments[2];
					style = 'info';
					content = ' role="button"><img src="' + baseUrl + '.png" alt="' + title + '" class="tool tool-mini"/><img src="' + baseUrl + 'x64.png" alt="' + title + '" class="tool tool-detail"/></a>';
					break;
				case 'group':
					style = 'primary';
					href = data && data.id && '#/ldap/home/group=' + encodeURIComponent(data.id);
					break;
				case 'project':
					style = 'success';
					href = data && data.id && '#/home/project/' + data.id;
					break;
				case 'user':
				default:
					style = 'warning';
					if (data && data.id) {
						title = current.$main.getFullName(data);
						href = '#/ldap/user/' + data.id;
						content = '>' + data.id.charAt(0) + data.id.charAt(1) + '</a>';
					} else {
						content = ' role="button">&nbsp;</a>';
					}
					break;
			}
			var result = '<a class="label label-' + style + ' avatar" data-toggle="tooltip" title="' + title + '"' + (href ? ' href="' + href + '"' : '');
			result += content || '><i class="' + current.$main.messageTypeClass[type] + '"></i></a>';
			return result;
		},

		/**
		 * Add messages in the notifications area.
		 * @param  {jquery} $content Target UI
		 * @param  {array} messages Array of messages object.
		 * @param  {integer} page Page number
		 */
		appendMessages: function ($content, messages, page) {
			if (messages.data.length) {
				// Append the messages
				for (var i = 0; i < messages.data.length; i++) {
					var message = messages.data[i];
					current.appendMessage($content, message, message.user || message.group || message.company || message.project || message.node);
				}
			} else if (page === 0) {
				// No messages on the first page
				$content.append('<div class="message-w no-messages">' + current.$messages.notifications['no-message'] + '</div>');
			}
		},

		appendMessage: function ($content, message, targetFull) {
			// Text of target
			var targetI18n = Handlebars.compile(current.$messages.notifications['to-' + message.targetType])(targetFull.name);
			var from = message.from && message.from.id && current.$main.getFullName(message.from);

			// Wrapper
			var content = '<div class="message-w pill' + (message.unread ? ' unread' : '') + ' message-type-' + message.targetType + '">';

			// Add avatar
			content += current.toAvatar(message.targetType, message.user ? message.from : (message.group || message.company || message.project || message.node), targetI18n);

			// Message text+from+to
			content += '<div class="message">';

			// From and target
			content += '<div class="message-header">';
			content += '<div class="from">' + current.$messages.notifications.from + (from ? ' : <a href="#/ldap/user/' + message.from.id + '">' + from + '</a>' : current.$messages.unknown) + '</div>';
			content += '<div class="to">' + current.$messages.notifications.to + ' : ';
			content += current.toLink(message.targetType, message.user ? message.from : targetFull, targetI18n);
			content += '</div></div>';

			// Add raw message
			content += '<div class="message-body">' + message.value + '</div>';
			content += '</div>';

			// Add x... ago
			if (message.createdDate) {
				var createdDate = moment(message.createdDate);
				content += '<span class="message-ago" data-container="body" data-toggle="tooltip" title="' + createdDate.format('LLL') + '">' + createdDate.fromNow() + '</span>';
			} else {
				content += '<span class="message-ago unknown" data-toggle="tooltip" title="' + current.$messages.unknown + '">&#8734;</span>';
			}

			// Add goto details
			content += '<i class="fa fa-angle-right message-goto"></i>';

			content += '</div>';
			$content.append(content);
		},

		/**
		 * Update the UI of select2 target depending on the current type.
		 * @param $form {jquery} The UI form.
		 * @param type {string} The Message target type.
		 */
		updateTargetSelect2: function ($form, type) {
			_('_message-to').removeClass('hidden').select2('destroy');
			$form.find('.details').html(current.$messages.notifications['new-to-' + type + '-details']);
			current.$main['newSelect2' + type.capitalize()]('.bs-inbox .message-new .target', null, null, null, type === 'project' && 'pkey', type === 'node').select2('data', null);
			_('_message-to').trigger('change');
		}
	};
	return current;
});
