/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(function () {
	var current = {
		/**
		 * Return a cookie value.
		 * @param  {Sring} name  Cookie name.
		 * @return {String}      Cookie value.
		 */
		getCookie: function (name) {
			var value = document.cookie;
			var start = value.indexOf(' ' + name + '=');
			if (start === -1) {
				start = value.indexOf(name + '=');
			}
			if (start === -1) {
				value = null;
			} else {
				start = value.indexOf('=', start) + 1;
				var end = value.indexOf(';', start);
				if (end === -1) {
					end = value.length;
				}
				value = unescape(value.substring(start, end));
			}
			return value;
		},

		/**
		 * Load session data.
		 */
		initialize: function () {
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'session',
				dataType: 'json',
				success: function (data) {
					_('userName').val(data.userName);
					_('session').val(current.getCookie('JSESSIONID'));
					if (data.applicationSettings) {
						_('buildNumber').val(parseInt(data.applicationSettings.buildNumber, 10));
						var timestamp = parseInt(data.applicationSettings.buildTimestamp, 10);
						if (isNaN(timestamp)) {
							_('buildTimestamp').val(data.applicationSettings.buildTimestamp);
							_('buildDate').val(formatManager.formatDate(NaN));
						} else {
							_('buildTimestamp').val(timestamp);
							_('buildDate').val(formatManager.formatDate(timestamp));
						}
						_('buildVersion').val(data.applicationSettings.buildVersion);
					} else {
						notifyManager.notifyDanger(current.$messages.noBuildInformation);
					}
				}
			});
			current.fetchSystem();
			_('defaultTimeZone').on('blur', function () {
				current.updateTimeZone('default', 'defaultTimeZone', $(this).val());
			});
			_('timeZone').on('blur', function () {
				current.updateTimeZone('application', 'timeZone', $(this).val());
			});
			_('cryptography').on('submit', function (e) {
				e.preventDefault();
				$.ajax({
					type: 'POST',
					url: REST_PATH + 'system/security/crypto',
					dataType: 'text',
					contentType: 'text/plain',
					data: _('to-encrypt').val(),
					success: function (data) {
						_('encrypted').text(data);
						_('to-encrypt').trigger('focus');
					}
				});
			});
		},

		/**
		 * Fetch system data.
		 */
		fetchSystem: function () {
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'system',
				dataType: 'json',
				success: function (data) {
					_('date').val(moment.utc(data.date.date).local().format('L-LT:ss') + ' / ' + data.date.date);
					_('cpu').val(data.cpu.total);
					_('timeZone').val(data.date.timeZone);
					_('defaultTimeZone').val(data.date.defaultTimeZone);
					_('originalDefaultTimeZone').val(data.date.originalDefaultTimeZone);
					var maxMemory = data.memory.maxMemory || data.memory.totalMemory + 1000000;
					var committedUsedPercent = Math.round(1000 * (data.memory.totalMemory - data.memory.freeMemory) / maxMemory) / 10;
					_('memory-committed-used').css({
						width: committedUsedPercent + '%'
					}).tooltip({
						html: true,
						title: 'Committed used memory<br/>' + committedUsedPercent + '%<br/>' + formatManager.formatSize(data.memory.totalMemory - data.memory.freeMemory) + ' / ' + formatManager.formatSize(data.memory.maxMemory)
					});
					var committedFreePercent = Math.round(1000 * data.memory.freeMemory / maxMemory) / 10;
					_('memory-committed-free').css({
						width: committedFreePercent + '%'
					}).tooltip({
						html: true,
						title: 'Committed free memory<br/>' + committedFreePercent + '%<br/>' + formatManager.formatSize(data.memory.freeMemory) + ' / ' + formatManager.formatSize(data.memory.maxMemory)
					});
					var freePercent = 100 - committedFreePercent - committedUsedPercent;
					_('memory-free').css({
						width: freePercent + '%'
					}).tooltip({
						html: true,
						title: 'Free memory<br/>' + freePercent + '%<br/>' + formatManager.formatSize(data.memory.maxMemory - data.memory.totalMemory) + ' / ' + formatManager.formatSize(data.memory.maxMemory)
					});
				}
			});
		},
		updateTimeZone: function (type, name, id) {
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'system/timezone/' + type,
				dataType: 'text',
				contentType: 'text/plain',
				data: id,
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.updated)(name));
				}
			});
		}
	};
	return current;
});
