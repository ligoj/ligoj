define(function () {
	var current = {

		/**
		 * Flag objects
		 */
		table: null,
		search: false,
		suspendSearch: false,

		/**
		 * Edited users's identifier
		 */
		currentId: 0,

		initialize: function (parameters) {
			current.onHashChange(parameters);
		},

		/**
		 * Manage internal navigation from URL.
		 * @param Accept group and company filtering from parameters.
		 */
		onHashChange: function (parameters) {
			// Search mode
			current.currentId = null;
			current.initializeSearch();

			if (parameters) {
				current.suspendSearch = true;
				var params = parameters.split('/');
				for (var idx = 0; idx < params.length; idx++) {
					var kv = params[idx].split('=');
					// Group/company filtering
					kv.length === 2 && _('search-' + kv[0]).select2('val', kv[1]).change();
				}
				current.suspendSearch = false;
				current.refreshDataTable();
			}
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

			// User edition pop-up
			_('popup').on('shown.bs.modal', function () {
				current.currentId ? _('groups').select2('focus') : _('id').focus();
			}).on('submit', function (e) {
				e.preventDefault();
				current.save();
			}).on('show.bs.modal', function (event) {
				var $source = $(event.relatedTarget);
				var $tr = $source.closest('tr');
				var uc = ($tr.length && current.table.fnGetData($tr[0])) || {};

				// 'Create another user' option, is only available for creation mode
				_('create-another').removeAttr('checked').closest('label')[uc.id ? 'addClass' : 'removeClass']('hide');
				current.fillPopup(uc);
			});
			_('company').select2({
				minimumInputLength: 0,
				initSelection: function (element, callback) {
					var data = {
						id: element.val(),
						text: element.val()
					};
					callback(data);
				},
				formatSearching: function () {
					return current.$messages.loading;
				},
				ajax: {
					url: REST_PATH + 'ldap/company/filter/write',
					dataType: 'json',
					data: function (term, page) {
						return {
							q: term, // search term
							rows: 15,
							page: page,
							filters: '{}',
							sidx: 'name',
							sord: 'asc'
						};
					},
					results: function (data, page) {
						var result = [];
						$(data.data).each(function () {
							result.push({id: this, text: this});
						});
						return {
							more: data.recordsFiltered > page * 10,
							results: result
						};
					}
				}
			});
			_('groups').select2({
				multiple: true,
				createSearchChoice: function () {
					// Disable additional values
					return null;
				},
				formatSearching: function () {
					return current.$messages.loading;
				},
				ajax: {
					url: REST_PATH + 'ldap/group/filter/write',
					dataType: 'json',
					data: function (term, page) {
						return {
							q: term, // search term
							rows: 15,
							page: page,
							filters: '{}',
							sidx: 'name',
							sord: 'asc'
						};
					},
					results: function (data, page) {
						var result = [];
						$(data.data).each(function () {
							result.push({id: this, text: this});
						});
						return {
							more: data.recordsFiltered > page * 10,
							results: result
						};
					}
				}
			});
			current.$main.newSelect2Group('#search-group');
			current.$main.newSelect2Company('#search-company');
			$('#search-group,#search-company').on('change', function () {
				current.refreshDataTable();
			});
			_('mail').on('blur', function () {
				var mail = _('mail').val();
				if (new RegExp('.*@(gmail\\.com|(yahoo|free|sfr|live|hotmail)\\.fr)', 'i').exec(mail)) {
					validationManager.addWarn(_('mail'), 'warn-mail-perso');
				} else {
					validationManager.reset(_('mail'));
				}
			});
			_('importPopup').on('shown.bs.modal', function () {
				$('.import-options input:checked').trigger('focus');
			}).on('show.bs.modal', function () {
				$('.import-progress').attr('aria-valuenow', '0').css('width', '0%').removeClass('progress-bar progress-bar-striped progress-bar-striped').empty();
				$('.import-summary').addClass('hide').empty();
				current.$parent.unscheduleUploadStep('ldap/user/batch');
			}).on('submit', function (e) {
				var mode = $(this).find('.import-options input:checked').is('.import-options-full') ? 'full' : 'atomic';
				$(this).ajaxSubmit({
					url: REST_PATH + 'ldap/user/batch/' + mode,
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
						current.$parent.scheduleUploadStep('ldap/user/batch', id);
					}
				});
				e.preventDefault();
				return false;
			});
			$('.import-options input').on('change', function () {
				$('.import-options-details').addClass('hidden').filter($(this).hasClass('import-options-full') ? '.import-options-full' : '.import-options-atomic').removeClass('hidden');
			});

			// Data tables filters
			_('create').on('click', function () {
				current.$parent.requireAgreement(current.showPopup, $(this));
			});
			_('upload-new').on('click', function () {
				current.$parent.requireAgreement(current.showPopupImport, $(this));
			});
			// Global datatables filter
			_('search').on('keyup', function () {
				current.table && current.table.fnFilter($(this).val());
			});

			_('table').on('click', '.delete', current.deleteUser).on('click', '.lock', current.lockUser).on('click', '.unlock', current.unlockUser).on('click', '.isolate', current.isolateUser).on('click', '.restore', current.restoreUser).on('click', '.update', function () {
				current.$parent.requireAgreement(current.showPopup, $(this));
			});

			// Also initialize the datatables component
			current.initializeDataTable();
		},

		/**
		 * refresh datatable with filters
		 */
		refreshDataTable: function () {
			if (current.table && !current.suspendSearch) {
				var company = $('#search-company').val();
				var group = $('#search-group').val();
				if (company || group) {
					current.table.fnSettings().ajax = REST_PATH + 'ldap/user?' + (company ? 'company=' + company : '') + ((company && group) ? '&' : '') + (group ? 'group=' + group : '');
				} else {
					current.table.fnSettings().ajax = REST_PATH + 'ldap/user';
				}
				current.table.api().ajax.reload();
			}
		},

		/**
		 * Initialize the users datatables (server AJAX)
		 */
		initializeDataTable: function () {
			current.table = _('table').dataTable({
				dom: 'rt<"row"<"col-xs-6"i><"col-xs-6"p>>',
				serverSide: true,
				searching: true,
				ajax: REST_PATH + 'ldap/user',
				columns: [
					{
						data: 'id',
						width: '80px',
						render: function (_i, _j, data) {
							return current.$main.getUserLoginLink(data);
						}
					}, {
						data: 'firstName',
						className: 'truncate'
					}, {
						data: 'lastName',
						className: 'truncate'
					}, {
						data: 'company',
						className: 'hidden-xs truncate'
					}, {
						data: 'mails',
						className: 'hidden-md hidden-sm hidden-xs truncate',
						render: function (mails) {
							return (mails && mails.length) ? '<a href="mailto:' + mails[0] + '">' + mails[0] + '</a>' : '';
						}
					}, {
						data: 'groups',
						orderable: false,
						className: 'hidden-sm hidden-xs truncate',
						render: function (_i, _j, data) {
							var groups = [];
							$(data.groups).each(function () {
								groups.push(this.name);
							});
							return groups;
						}
					}, {
						data: null,
						width: '32px',
						orderable: false,
						render: function (_i, _j, data) {
							var editlink = '<a class="update"><i class="fa fa-pencil" data-toggle="tooltip" title="' + current.$messages.update + '"></i></a>';
							if (data.managed) {
								editlink += '<div class="btn-group"><i data-toggle="dropdown" class="fa fa-cog"></i><ul class="dropdown-menu dropdown-menu-right">';
								if (data.isolated) {
									// Isolated -> restore
									editlink += '<li><a class="restore"><i class="menu-icon fa fa-sign-in"></i> ' + current.$messages.restore + '</a></li>';
								} else if (data.locked) {
									// Locked -> unlock or isolate
									editlink += '<li><a class="unlock"><i class="menu-icon fa fa-unlock"></i> ' + current.$messages.unlock + '</a></li>';
									editlink += '<li><a class="isolate"><i class="menu-icon fa fa-sign-out"></i> ' + current.$messages.isolate + '</a></li>';
								} else {
									// Unlocked -> lock or isolate
									editlink += '<li><a class="lock"><i class="menu-icon fa fa-lock"></i> ' + current.$messages.lock + '</a></li>';
									editlink += '<li><a class="isolate"><i class="menu-icon fa fa-sign-out"></i> ' + current.$messages.isolate + '</a></li>';
								}

								// Delete icon
								editlink += '<li><a class="delete"><i class="menu-icon fa fa-trash"></i> ' + current.$messages.delete + '</a></li>';
								editlink += '</ul>';
								editlink += '</div>';
							}
							return editlink;
						}
					}
				]
			});
		},

		showPopup: function ($context) {
			_('popup').modal('show', $context);
		},
		showPopupImport: function ($context) {
			_('importPopup').modal('show', $context);
		},

		formToObject: function () {
			return {
				id: ($('#id').val() || '').toLowerCase(),
				firstName: $('#firstName').val() || null,
				lastName: $('#lastName').val() || null,
				department: $('#department').val() || null,
				localId: $('#localId').val() || null,
				mail: $('#mail').val() || null,
				company: $('#company').val(),
				groups: $('#groups').val() ? $('#groups').val().split(',') : []
			};
		},

		save: function () {
			// Might be a long operation, add a pending indicator
			_('confirmCreate').button('loading');
			var data = current.formToObject();
			$.ajax({
				type: current.currentId ? 'PUT' : 'POST',
				url: REST_PATH + 'ldap/user',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function () {
					if (current.currentId) {
						notifyManager.notify(Handlebars.compile(current.$messages.updated)(data.id));
					} else {
						notifyManager.notify(Handlebars.compile(current.$messages['created-account'])(data));
					}
					current.table && current.table.api().ajax.reload();
					if ($('#create-another:checked').length) {
						// Only reset the popup
						current.fillPopup({});
						_('id').focus();
					} else {
						_('popup').modal('hide');
					}
				},
				complete: function () {
					// Whatever the result, stop the indicator
					_('confirmCreate').button('complete');
				}
			});
		},

		/**
		 * Fill the popup with given entity.
		 * @param {Object} uc, the entity corresponding to the user.
		 */
		fillPopup: function (uc) {
			validationManager.reset(_('popup'));
			current.currentId = uc.id;
			_('id').val(uc.id || '');
			_('firstName').val(uc.firstName || '');
			_('lastName').val(uc.lastName || '');
			_('department').val(uc.department || '');
			_('localId').val(uc.localId || '');
			_('mail').val((uc.mails && uc.mails[0]) || '');
			_('company').select2('val', uc.company || null);
			if (uc.groups && uc.groups.length) {
				var groupsAsTag = [];
				$(uc.groups).each(function () {
					groupsAsTag.push({
						id: this.name,
						text: this.name,
						locked: !this.managed
					});
				});
				_('groups').select2('data', groupsAsTag);
			} else {
				_('groups').select2('data', []);
			}

			// id and company are read-only
			if (uc.id) {
				_('id').attr('readonly', 'readonly');
			} else {
				_('id').removeAttr('readonly');
			}

			// Mark as read-only the fields the user cannot update
			var $inputs = _('popup').find('input[type="text"]').not('#groups').not('.select2-input,.select2-focusser');
			if (uc.managed || !(uc.id && true)) {
				$inputs.removeAttr('readonly');
				if (uc.isolated) {
					_('company').attr('readonly', 'readonly');
				}
			} else {
				$inputs.attr('readonly', 'readonly');
			}
		},

		/**
		 * Delete the selected user after popup confirmation, or directly from its identifier.
		 */
		deleteUser: function (id, name) {
			if ((typeof id) === 'string') {
				// Delete without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'ldap/user/' + id,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages.deleted)(name));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($(this).closest('tr')[0]);
				bootbox.confirmDelete(function (confirmed) {
					confirmed && current.deleteUser(entity.id, entity.firstName + ' ' + entity.lastName);
				}, entity.id + ' [' + current.$main.getFullName(entity) + ']');
			}
		},

		/**
		 * Lock the selected user after popup confirmation, or directly from its identifier.
		 */
		lockUser: function (id, name) {
			current.confirmUserOperation($(this), id, name, 'lock', 'locked');
		},
		/**
		 * Isolate the selected user after popup confirmation, or directly from its identifier.
		 */
		isolateUser: function (id, name) {
			current.confirmUserOperation($(this), id, name, 'isolate', 'isolated');
		},

		/**
		 * Unlock the selected user.
		 */
		unlockUser: function () {
			current.userOperation($(this), 'unlock', 'unlocked');
		},
		/**
		 * Restore the selected user.
		 */
		restoreUser: function () {
			current.userOperation($(this), 'restore', 'restored');
		},

		/**
		 * Disable/Lock the selected user after popup confirmation, or directly from its identifier.
		 */
		confirmUserOperation: function ($item, id, name, operation, operated) {
			if ((typeof id) === 'string') {
				// Process without confirmation
				$.ajax({
					type: 'DELETE',
					url: REST_PATH + 'ldap/user/' + id + '/' + operation,
					success: function () {
						notifyManager.notify(Handlebars.compile(current.$messages[operated + '-confirm'])(name));
						current.table && current.table.api().ajax.reload();
					}
				});
			} else {
				// Requires a confirmation
				var entity = current.table.fnGetData($item.closest('tr')[0]);
				bootbox.confirm(function (confirmed) {
					confirmed && current.confirmUserOperation($item, entity.id, entity.firstName + ' ' + entity.lastName, operation, operated);
				}, current.$messages[operation], Handlebars.compile(current.$messages[operation + '-confirm'])(entity.id + ' [' + current.$main.getFullName(entity) + ']'), current.$messages[operation]);
			}
		},

		/**
		 * Enable/Unlock the selected user.
		 */
		userOperation: function ($item, operation, operated) {
			var entity = current.table.fnGetData($item.closest('tr')[0]);
			var id = entity.id;
			var name = entity.firstName + ' ' + entity.lastName;
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'ldap/user/' + id + '/' + operation,
				success: function () {
					notifyManager.notify(Handlebars.compile(current.$messages[operated + '-confirm'])(name));
					current.table && current.table.api().ajax.reload();
				}
			});
		}
	};
	return current;
});
