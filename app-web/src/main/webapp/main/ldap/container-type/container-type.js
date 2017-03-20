define(function () {
	var current = {

		/**
		 * Flag objects
		 */
		table: null,
		search: false,
		containerType: 'group',

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
		onHashChange: function () {
			// Search mode
			current.currentId = null;
			current.initializeSearch();
			$(function() {
				_('search').trigger('focus');
			});
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
				_('name').focus();
			}).on('show.bs.modal', function (event) {
				validationManager.reset($(this));
				var $source = $(event.relatedTarget);
				var $tr = $source.closest('tr');
				var uc = ($tr.length && current.table.fnGetData($tr[0])) || undefined;
				uc = uc && uc.id ? uc : {};
				current.currentId = uc.id;
				_('modal-title').html(Handlebars.compile(current.$messages['container-type-title'])(current.$messages[current.containerType]));
				_('name').val(uc.name || null);
				_('dn').val(uc.dn || null);
			});
			_('type').on('change', 'input[type="radio"]', function () {
				current.containerType = $(this).attr('id');
				current.table.api().ajax.reload();
			});

			// Global datatables filter
			_('search').on('keyup', function () {
				current.table && current.table.fnFilter($(this).val());
			});

			// Also initialize the datatables component
			current.initializeDataTable();
		},

		/**
		 * Initialize the users datatables (server AJAX)
		 */
		initializeDataTable: function () {
			current.table = _('table').dataTable({
				dom: 'rt<"row"<"col-xs-6"i><"col-xs-6"p>>',
				serverSide: true,
				searching: true,
				ajax: function () {
					return REST_PATH + 'ldap/container-type/' + current.containerType;
				},
				createdRow: function (nRow) {
					$(nRow).find('.delete').on('click', current.deleteEntry);
				},
				columns: [{
					data: 'name',
					width: '150px'
				}, {
					data: 'dn',
					className: 'truncate'
				}, {
					data: null,
					width: '48px',
					orderable: false,
					render: function (_i, _j, data) {
						if (!data.locked) {
							var editlink = '<a class="update" data-toggle="modal" data-target="#popup"><i class="fa fa-pencil" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a>';
							return editlink + '<a class="delete"><i class="fa fa-trash" data-toggle="tooltip" title="' + current.$messages.delete + '"></i></a>';
						}
						return '&nbsp;';
					}
				}]
			});
		},

		formToObject: function () {
			return {
				id: current.currentId,
				name: _('name').val(),
				dn: _('dn').val(),
				type: current.containerType
			};
		},

		save: function () {
			var data = current.formToObject();
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'ldap/container-type',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (data) {
					notifyManager.notify(Handlebars.compile(
						current.$messages[current.currentId ? 'updated' : 'created'])(current.currentId || data));
					current.table && current.table.api().ajax.reload();
					_('popup').modal('hide');
				}
			});
		},

		/**
		 * Delete the selected entry after popup confirmation, or directly from its identifier.
		 */
		deleteEntry: function (id, text) {
			if ((typeof id) === 'number') {
				// Delete without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'ldap/container-type/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.deleted)(text + '(' + id + ')'));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				var display = entity.name + '/' + entity.type;
				bootbox.confirmDelete(function (confirmed) {
					confirmed && current.deleteEntry(entity.id, display);
				}, text);
			}
		}
	};
	return current;
});
