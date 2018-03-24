/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define([
	'cascade', 'clipboard/clipboard'
], function ($cascade, Clipboard) {
	var current = {

		// the main table
		table: null,

		removePopup: function () {
			var tr = $(this).parents('tr');
			var name = current.table.fnGetData(tr[0]);
			bootbox.confirmDelete(function (confirmed) {
				confirmed && current.remove(name);
			}, name);
		},

		/**
		 * Delete a named token
		 * @param  {string} name Name of the token to delete.
		 */
		remove: function (name) {
			$.ajax({
				type: 'DELETE',
				url: REST_PATH + 'api/token/' + encodeURIComponent(name),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.deleted)(name));
					current.table && current.table.api().ajax.reload();
				}
			});
		},

		/**
		 * Create a new token from its name.
		 * @param  {string} name Name of the token
		 */
		create: function (name) {
			name && $.ajax({
				type: 'POST',
				url: REST_PATH + 'api/token/' + encodeURIComponent(name),
				dataType: 'text',
				contentType: 'application/json',
				success: function (token) {
					notifyManager.notify(Handlebars.compile(current.$messages.created)(name));
					_('popup').modal('show', {
						name: name,
						token: token
					});
					current.table && current.table.api().ajax.reload();
				}
			});
		},

		/**
		 * Regenerate the token from its name.
		 * @param  {string} name Name of the token.
		 */
		regenerate: function (name) {
			$cascade.appendSpin(_('popup').find('.modal-body'));
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'api/token/' + encodeURIComponent(name),
				dataType: 'text',
				contentType: 'application/json',
				success: function (token) {
					notifyManager.notify(Handlebars.compile(current.$messages.updated)(name));
					_('token').val(token);
				},
				complete: function () {
					$cascade.removeSpin(_('popup').find('.modal-body'));
				}
			});
		},

		/**
		 * Load a token from its name and put it in the UI.
		 * @param  {[type]} name Token name
		 */
		load: function (name) {
			$cascade.appendSpin(_('popup').find('.modal-body'));
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'api/token/' + encodeURIComponent(name),
				dataType: 'text',
				contentType: 'application/json',
				success: function (token) {
					_('token').val(token);
				},
				complete: function () {
					$cascade.removeSpin(_('popup').find('.modal-body'));
				}
			});
		},

		initialize: function () {
			_('popup').on('shown.bs.modal', function () {
				_('token').focus();
			}).on('show.bs.modal', function (event) {
				validationManager.reset(_('popup'));
				// Fill values
				if (event.relatedTarget && event.relatedTarget.name) {
					_('token').val(event.relatedTarget.token);
					_('name').text(event.relatedTarget.name);
				} else {
					var $source = $(event.relatedTarget);
					var name = $source.length && current.table.fnGetData($source.closest('tr')[0]);
					_('token').val('');
					_('name').text(name);
					if ($source.data('mode') === 'regenerate') {
						// Regenerate the token
						current.regenerate(name);
					} else {
						// Load the token
						current.load(name);
					}
				}
			});

			// Setup clipboard
			new ClipboardJS('.btn[data-clipboard-target]').on('success', function () {
				notifyManager.notify(current.$messages.copied);
			});

			// Setup table
			current.table = _('table').dataTable({
				dom: '<"row"<"col-sm-6"B><"col-sm-6"f>r>t',
				destroy: true,
				pageLength: -1,
				ajax: {
					url: REST_PATH + 'api/token',
					dataSrc: ''
				},
				createdRow: function (nRow) {
					$(nRow).find('.delete').on('click', current.removePopup);
				},
				columns: [
					{
						data: null,
						render: function (data) {
							return data + ' ';
						}
					}, {
						data: null,
						width: '55px',
						orderable: false,
						render: function () {
							var row = '<a class="show-token" data-toggle="modal" data-target="#popup"><i class="fas fa-eye-slash" data-toggle="tooltip" title="' + current.$messages.show + '"></i></a>';
							row += '<a class="regenerate" data-toggle="modal" data-target="#popup" data-mode="regenerate"><i class="fas fa-sync-alt" data-toggle="tooltip" title="' + current.$messages.regenerate + '"></i></a>';
							row += '<a class="delete"><i class="fas fa-times" data-toggle="tooltip" title="' + current.$messages['delete'] + '"></i></a>';
							return row;
						}
					}
				],
				buttons: [
					{
						extend: 'create',
						action: function () {
							bootbox.prompt(current.$messages.name, current.create);
						}
					}
				]
			});
		}
	};
	return current;
});
