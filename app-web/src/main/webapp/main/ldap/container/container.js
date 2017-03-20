define(function () {
	var current = {

		/**
		 * Flag objects
		 */
		table: null,
		search: false,
		containerType: null,

		/**
		 * Edited container's identifier
		 */
		currentId: 0,

		initialize: function (parameters) {
			current.onHashChange(parameters);
		},

		/**
		 * Manage internal navigation.
		 */
		onHashChange: function (parameter) {
			// Search mode
			current.currentId = null;
			var previousContainerType = current.containerType;
			current.containerType = parameter || 'group';
			current.initializeSearch();

			if (current.table === null || (current.table && previousContainerType && previousContainerType !== current.containerType)) {
				// Initialize the datatables when type is changed
				current.initializeDataTable();
			}
			$(function() {
				_('table_filter').find('input').trigger('focus');
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

			// Container edition pop-up
			_('popup').on('shown.bs.modal', function () {
				_('name').focus();
			}).on('show.bs.modal', function (event) {
				validationManager.reset($(this));
				var $source = $(event.relatedTarget);
				var $tr = $source.closest('tr');
				var uc = ($tr.length && current.table.fnGetData($tr[0])) || undefined;
				uc = uc && uc.id ? uc : {};
				current.currentId = uc.id;
				_('name').val(null);
				_('modal-title').html(current.$messages[current.containerType]);
			});
			_('importPopup').on('show.bs.modal', function () {
				$('.import-progress').attr('aria-valuenow', '0').css('width', '0%').removeClass('progress-bar progress-bar-striped progress-bar-striped').empty();
				$('.import-summary').addClass('hide').empty();
				current.$parent.unscheduleUploadStep('ldap/group/batch');
			}).on('submit', function (e) {
				$(this).ajaxSubmit({
					url: REST_PATH + 'ldap/group/batch/full',
					type: 'POST',
					dataType: 'json',
					beforeSubmit: function () {
						// Reset the summary
						$('.import-summary').html('Uploading...').removeClass('alert-danger').removeClass('alert-success').addClass('alert-info').removeClass('hide');
						$('.import-progress').addClass('progress-bar progress-bar-striped progress-bar-striped');
						validationManager.reset(_('importPopup'));
						validationManager.mapping.DEFAULT = 'csv-file';
					},
					success: function (id) {
						$('.import-summary').html('Processing...');
						current.$parent.scheduleUploadStep('ldap/group/batch', id);
					}
				});
				e.preventDefault();
				return false;
			});

			_('type').select2({
				minimumInputLength: 0,
				formatSearching: function () {
					return current.$messages.loading;
				},
				ajax: {
					url: function () {
						return REST_PATH + 'ldap/container-type/' + current.containerType;
					},
					dataType: 'json',
					data: function (term, page) {
						return {
							q: term, // search term
							rows: 15,
							page: page,
							sidx: 'name',
							sord: 'asc'
						};
					},
					results: function (data, page) {
						var result = [];
						$(data.data).each(function () {
							if (!this.locked) {
								result.push({id: this.id, text: this.name});
							}
						});
						return {
							more: data.recordsFiltered > page * 10,
							results: result
						};
					}
				}
			});
		},

		/**
		 * Initialize the containers datatables (server AJAX)
		 */
		initializeDataTable: function () {
			current.table = _('table').dataTable({
				dom: '<"row"<"col-xs-5"B><"col-xs-7"f>r>t<"row"<"col-xs-6"i><"col-xs-6"p>>',
				serverSide: true,
				searching: true,
				destroy: true,
				ajax: function () {
					return REST_PATH + 'ldap/' + current.containerType;
				},
				createdRow: function (nRow) {
					$(nRow).find('.delete').on('click', current.deleteContainer);
					$(nRow).find('.empty').on('click', current.emptyContainer);
				},
				columns: [
					{
						data: 'name',
						render: function (_i, _j, data) {
							return '<a href="#/ldap/home/' + data.containerType + '=' + data.name + '">' + data.name + '</a>';
						}
					}, {
						data: 'type',
						orderable: false
					}, {
						data: 'count',
						width: '64px',
						orderable: false,
						className: 'hidden-xs truncate',
						render: function (_i, _j, data) {
							return data.count ? data.count === data.countVisible ? data.countVisible : data.countVisible + '(' + data.count + ')' : '';
						}
					}, {
						data: 'canAdmin',
						orderable: false,
						width: '16px',
						render: function (_i, _j, data) {
							return data.canAdmin ? '<i class="fa fa-check"></i>' : '&nbsp;';
						}
					}, {
						data: 'canWrite',
						orderable: false,
						width: '16px',
						render: function (_i, _j, data) {
							return data.canWrite ? '<i class="fa fa-check"></i>' : '&nbsp;';
						}
					}, {
						data: 'locked',
						orderable: false,
						width: '16px',
						render: function (_i, _j, data) {
							return data.locked ? '<i class="fa fa-check"></i>' : '&nbsp;';
						}
					}, {
						data: null,
						orderable: false,
						width: current.containerType === 'group' ? '34px' : '16px',
						render: function (_i, _j, data) {
							var result = '';
							if (data.canWrite && data.containerType === 'group' && data.count) {
								// Empty the container, for now only for group
								result += '<a class="empty"><i class="fa fa-user-times" data-toggle="tooltip" title="' + current.$messages['empty-group'] + '"></i></a>';
							}
							if (data.locked !== true && data.canAdmin && (data.containerType === 'group' || data.count === 0)) {
								// Delete the container
								result += '<a class="delete"><i class="fa fa-trash" data-toggle="tooltip" title="' + current.$messages['delete'] + '"></i></a>';
							}
							return result || '&nbsp;';
						}
					}
				],
				buttons: [
					{
						extend: 'popup',
						className: 'btn-success'
					}, {
						extend: 'popup',
						target: '#importPopup',
						className: current.containerType === 'group' ? '' : 'hidden',
						text: current.$messages['upload-new']
					}
				]
			});
		},

		formToObject: function () {
			var result = {
				name: _('name').val(),
				type: _('type').val()
			};

			return result;
		},

		save: function () {
			var data = current.formToObject();
			$.ajax({
				type: 'POST',
				url: REST_PATH + 'ldap/' + current.containerType,
				dataType: 'text',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages.created)(data.name));
					current.table && current.table.api().ajax.reload();
					_('popup').modal('hide');
				}
			});
		},

		/**
		 * Delete the selected container after popup confirmation, or directly from its identifier.
		 */
		deleteContainer: function (id) {
			if ((typeof id) === 'string') {
				// Delete without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'ldap/' + current.containerType + '/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.deleted)(id));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				bootbox.confirmDelete(function (confirmed) {
					confirmed && current.deleteContainer(entity.name);
				}, entity.name + '(' + entity.type + ')');
			}
		},

		/**
		 * Remove all members from given container
		 */
		emptyContainer: function (id) {
			if ((typeof id) === 'string') {
				// Delete without confirmation
				$.ajax({
					type: 'POST',
					url: REST_PATH + 'ldap/' + current.containerType + '/empty/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.updated)(id));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				bootbox.dialog({
					message: Handlebars.compile(current.$messages['empty-group-details'])([
						entity.name, entity.count, entity.count - entity.countVisible
					]),
					title: current.$messages['empty-group-title'],
					onEscape: true,
					backdrop: '-',
					buttons: {
						danger: {
							label: current.$messages['empty-group-title'],
							className: 'btn-danger',
							callback: function (confirmed) {
								confirmed && current.emptyContainer(entity.name);
							}
						},
						cancel: {
							label: current.$messages.cancel,
							className: 'btn-link'
						}
					}
				});
			}
		}
	};
	return current;
});
