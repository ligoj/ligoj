/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(function () {
	var current = {

		// the main table
		table: null,

		// Helper function to serialize all the form fields into a JSON string
		formToJSON: function () {
			return JSON.stringify({
				login: _('login').val(),
				roles: _('roles').select2('val')
			});
		},

		// ---------------- BUTTON MANAGEMENT ----------------

		// delete button management
		deleteButton: function () {
			var tr = $(this).parents('tr');
			var uc = current.table.fnGetData(tr[0]);
			bootbox.confirmDelete(function (confirmed) {
				confirmed && current.deleteEntity(uc.login);
			}, uc.name);
		},

		// create button management
		createButton: function () {
			_('popup').modal('show');
			return false;
		},

		// ---------------- BUSINESS CALL ----------------
		// delete business call
		deleteEntity: function (id) {
			$.ajax({
				type: 'DELETE',
				url: REST_PATH + 'system/user/' + id,
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.deleted)(id));
					// Refresh the table
					current.table && current.table.api().ajax.reload();
				},
				error: function () {
					notifyManager.notifyDanger(Handlebars.compile(current.$messages.notDeleted)(id));
				}
			});
		},

		// Save or update API call
		saveOrUpdate: function (method) {
			$.ajax({
				type: method,
				url: REST_PATH + 'system/user',
				dataType: 'json',
				contentType: 'application/json',
				data: current.formToJSON(),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.created)(_('login').val()));
					_('popup').modal('hide');
					// Refresh the table
					current.table && current.table.api().ajax.reload();
				}
			});
		},

		// initialize the page
		initialize: function () {
			// initialize components
			_('create').click(function () {
				current.saveOrUpdate('POST');
			});
			_('save').click(function () {
				current.saveOrUpdate('PUT');
			});

			current.initializeDataTable();
			current.$parent.populateRole('roles');

			_('roles').select2();

			// update focus when modal popup is dhown
			_('popup').on('shown.bs.modal', function () {
				_('login').focus();
			}).on('show.bs.modal', function (event) {
				var $source = $(event.relatedTarget);
				var $tr = $source.closest('tr');
				var uc = ($tr.length && current.table.fnGetData($tr[0])) || undefined;
				_('login').val(uc && uc.login).prop('disabled', uc ? true : false);
				_('roles').select2('val', uc ? $.makeArray($(uc.roles).map(function () {
					return this.id;
				})) : []);
				$('.modal-title').text(current.$messages[uc ? 'updateUser' : 'newUser']);
				if (uc) {
					_('create').addClass('hidden');
					_('save').removeClass('hidden');
				} else {
					_('create').removeClass('hidden');
					_('save').addClass('hidden');
				}
				validationManager.reset($(this));
			});
		},

		// initialize the datatable
		initializeDataTable: function () {
			current.table = _('table').dataTable({
				searching: true,
				serverSide: true,
				processing: true,
				searchDelay: 500,
				dom: '<"row"<"col-xs-6"B><"col-xs-6"f>r>t<"row"<"col-xs-6"i><"col-xs-6"p>>',
				ajax: REST_PATH + 'system/user/roles',
				fnServerData: function () {
					dataTableFilterManager.addFilterData.apply(dataTableFilterManager, arguments);
				},
				filterSelector: function () {
					return $('.dataTables_filter input[type="search"]');
				},
				filterMapping: {
					table_filter: function (rootFilters, value, helper) {
						var filter = helper.addGroupFilter(rootFilters, 'or');
						helper.addFilter(filter, 'login', 'cn', value);
						helper.addFilter(filter, 'role', 'cn', value);
					}
				},
				createdRow: function (nRow) {
					$(nRow).find('.delete').on('click', current.deleteButton);
				},
				columns: [{
					data: 'login'
				}, {
					data: null,
					orderable: false,
					render: function (_i, _j, data) {
						return $.makeArray($(data.roles).map(function () {
							return this.name;
						})).join();
					}
				}, {
					data: null,
					width: '30px',
					orderable: false,
					render: function () {
						return '<a data-toggle="modal" data-target="#popup"><i class="fas fa-pencil-alt" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a><a class="delete"><i class="fas fa-times" data-toggle="tooltip" title="' + current.$messages['delete'] + '"></i></a>';
					}
				}],
				buttons: [{
					extend: 'popup',
					className: 'btn-success btn-raised'
				}]
			});
		}
	};
	return current;
});
