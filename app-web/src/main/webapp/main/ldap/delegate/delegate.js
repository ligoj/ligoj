define(function () {
	var current = {

		/**
		 * Flag objects
		 */
		table: null,
		search: false,

		/**
		 * Edited users's identifier
		 */
		currentId: 0,

		initialize: function (parameters) {
			current.onHashChange(parameters);
		},

		/**
		 * Manage internal navigation.
		 */
		onHashChange: function (/* parameter */) {
			// Search mode
			delete current.currentId;
			current.initializeSearch();
		},

		/**
		 * Initialize the search UI components
		 */
		initializeSearch: function () {
			if (current.search) {
				return;
			}
			current.search = true;
			_('confirmCreate').click(current.save);

			// User edition pop-up
			_('popup').on('shown.bs.modal', function () {
				_('receiver').select2('focus');
			}).on('show.bs.modal', function (event) {
				validationManager.reset($(this));
				var $source = $(event.relatedTarget);
				var $tr = $source.closest('tr');
				var uc = ($tr.length && current.table.fnGetData($tr[0])) || undefined;
				uc = uc && uc.id ? uc : {};
				current.currentId = uc.id;
				_('canAdmin').prop('checked', uc.canAdmin || false);
				_('canWrite').prop('checked', uc.canWrite || false);
				current.updateDropdownIcon('receiver', uc.receiverType || 'user', uc.receiver || null);
				current.updateDropdownIcon('resource', uc.type || 'group', uc.name || null);
			}).on('click', '.dropdown-menu [data-type]', function() {
				// Toggle selection
				current.updateDropdownIcon($(this).closest('[data-group]').attr('data-group'), $(this).attr('data-type'));
			});

			// Global datatables filter
			_('search').on('keyup', function () {
				current.table && current.table.fnFilter($(this).val());
			});

			// Display the right component for selected type
			$('#type').on('change', current.synchronizeObjectStatus);

			$('.search-type').on('click', function () {
				$(this).addClass('active').siblings().removeClass('active');
				var type = $(this).val();
				current.table.fnSettings().ajax = REST_PATH + 'ldap/delegate' + (type ? '?type=' + type.toUpperCase() : '');
				current.table.api().ajax.reload();
			});

			// Also initialize the datatables component
			current.initializeDataTable();
		},

		/**
		 * Synchronize the visible inputs and related UI depending on the selected type.
		 * @param inputId {string} Identifier of input determining the resource or the receiver. Used to find the couple "type/input"
		 */
		updateDropdownIcon: function (inputId, type, value) {
			var $input = _(inputId);
			var $group = $input.closest('.form-group');

			// Update the selected drop down item
			$group.find('.dropdown-menu [data-type]').find('.active').removeClass('active').end().find('[data-type="'+type+'"]').addClass('active');;

			// Update the drop down icon
			$group.find('.dropdown-toggle i').attr('class', current.$main.messageTypeClass[type]);

			// Invalidate the previous select2
			$input.removeAttr('placeholder').select2('destroy');
			var select2Init = current.$main['newSelect2'+type.capitalize()];
			if (typeof select2Init === 'function') {
				// Select2 input available, build it and push the right data/value
				select2Init($input, (type === 'group' || type === 'company') ? '/admin' : undefined).select2(typeof value === 'object' ? 'data' : 'val', value || null);
			} else {
				// Simple text
				$input.val(value || null).attr('placeholder', current.$messages.tree);
			}
		},

		showPopup: function (context) {
			_('popup').modal('show', context);
		},

		/**
		 * Initialize the users datatables (server AJAX)
		 */
		initializeDataTable: function () {
			current.table = _('table').dataTable({
				dom: 'rt<"row"<"col-xs-6"i><"col-xs-6"p>>',
				serverSide: true,
				searching: true,
				ajax: REST_PATH + 'ldap/delegate',
				createdRow: function (nRow) {
					$(nRow).find('.update').on('click', function () {
						current.$parent.requireAgreement(current.showPopup, $(this));
					});
					$(nRow).find('.delete').on('click', current.deleteDelegate);
				},
				columns: [
					{
						data: 'receiverType',
						className: 'hidden-xs truncate',
						render: function (value) {
							return '<i class="' + current.$main.messageTypeClass[value] + '"></i> ' + current.$messages[value];
						}
					}, {
						data: 'receiver',
						width: '150px',
						ordering: false,
						render: function (_i, _j, data) {
							return current.$main.getUserLink(data.receiver);
						}
					}, {
						data: 'type',
						className: 'hidden-xs truncate',
						render: function (value) {
							return '<i class="' + current.$main.messageTypeClass[value] + '"></i> ' + current.$messages[value];
						}
					}, {
						data: 'name',
						className: 'truncate'
					}, {
						data: 'canAdmin',
						width: '16px',
						render: function (value) {
							return value ? '<i class="fa fa-check"></i>' : '&nbsp;';
						}
					}, {
						data: 'canWrite',
						width: '16px',
						render: function (value) {
							return value ? '<i class="fa fa-check"></i>' : '&nbsp;';
						}
					}, {
						data: 'managed',
						width: '32px',
						orderable: false,
						render: function (value) {
							if (value) {
								var editlink = '<a class="update"><i class="fa fa-pencil" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a>';
								return editlink + '<a class="delete"><i class="fa fa-remove" data-toggle="tooltip" title="' + current.$messages.delete + '"></i></a>';
							}
							return '&nbsp;';
						}
					}
				],
				buttons: [
					{
						extend: 'create',
						action: function () {
							current.$parent.requireAgreement(current.showPopup);
						}
					}
				]
			});
		},

		formToObject: function () {
			var $popup = _('popup');
			var result = {
				id: current.currentId,
				receiver: _('receiver').val(),
				receiverType: $popup.find('[data-group="receiver"]').find('[data-type].active').attr('data-type'),
				name: _('resource').val(),
				type: $popup.find('[data-group="resource"]').find('[data-type].active').attr('data-type'),
				canAdmin: $('#canAdmin:checked').length === 1 || undefined,
				canWrite: $('#canWrite:checked').length === 1 || undefined
			};

			return result;
		},

		save: function () {
			var data = current.formToObject();
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'ldap/delegate',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (data) {
					notifyManager.notify(Handlebars.compile(current.$messages[current.currentId ? 'updated' : 'created'])(current.currentId || data));
					current.table && current.table.api().ajax.reload();
					_('popup').modal('hide');
				}
			});
		},

		/**
		 * Delete the selected user after popup confirmation, or directly from its identifier.
		 */
		deleteDelegate: function (id, text) {
			if ((typeof id) === 'number') {
				// Delete without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'ldap/delegate/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.deleted)(text + '(' + id + ')'));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				var display = entity.user.id + '/' + entity.type + '/' + entity.name;
				bootbox.confirmDelete(function (confirmed) {
					confirmed && current.deleteDelegate(entity.id, display);
				}, text);
			}
		}
	};
	return current;
});
