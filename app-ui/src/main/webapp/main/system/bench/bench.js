/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define(['cascade'], function ($cascade) {
	var current = {

		initialize: function () {
			// Multipart submit
			_('details').on('submit', function (e) {
				e.preventDefault();
				current.initResult();
				current.benchInsert();
			});
		},

		/**
		 * Initialize the display.
		 */
		initResult: function () {
			_('insert').hideGroup();
			_('select').hideGroup();
			_('select-all').hideGroup();
			_('update').hideGroup();
			_('delete').hideGroup();
			_('download').hideGroup();
		},

		spin: function (id) {
			var $selector = _(id);
			current.spinOff();
			$selector.val('').showGroup();
			$selector.closest('.form-group').find('.fa-spin').removeClass('hidden');
		},

		spinOff: function () {
			current.$view.find('.fa-spin').addClass('hidden');
		},

		/**
		 * Bench INSERT
		 */
		idBenchUpload: 0,
		benchInsert: function () {
			current.spin('insert');
			_('details').ajaxSubmit({
				url: REST_PATH + 'system/bench',
				type: 'POST',
				dataType: $cascade.isOldIE ? 'text' : 'json',
				iframe: $cascade.isOldIE,
				success: function (data) {
					_('insert').val(data.duration);

					var $picture = _('picture');
					if (_('blob').val()) {
						if (_('blob').val().match('\\.(png|jpeg|jpg|gif)$')) {
							$picture.attr({
								src: REST_PATH + 'system/bench/picture.png?' + (current.idBenchUpload++)
							}).removeClass('hidden');
						}
						_('download').attr({
							href: REST_PATH + 'system/bench/picture.png?' + (current.idBenchUpload++)
						}).showGroup();
					} else {
						$picture.addClass('hidden');
						_('download').addClass('hidden');
					}
					current.select();
				},
				error: function () {
					current.spinOff();
				}
			});
		},

		/**
		 * Bench SELECT
		 */
		select: function () {
			current.spin('select');
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'system/bench',
				dataType: 'json',
				success: function (data) {
					_('select').val(data.duration);
					current.selectAll();
				},
				error: function () {
					current.spinOff();
				}
			});
		},

		/**
		 * Bench SELECT *
		 */
		selectAll: function () {
			current.spin('select-all');
			$.ajax({
				type: 'GET',
				url: REST_PATH + 'system/bench/all',
				dataType: 'json',
				success: function (data) {
					_('select-all').val(data.duration);
					current.update();
				},
				error: function () {
					current.spinOff();
				}
			});
		},

		/**
		 * Bench UPDATE
		 */
		update: function () {
			current.spin('update');
			$.ajax({
				type: 'PUT',
				url: REST_PATH + 'system/bench',
				dataType: 'json',
				success: function (data) {
					_('update').val(data.duration);
					current.deleteB();
				},
				error: function () {
					current.spinOff();
				}
			});
		},

		/**
		 * Bench DELETE
		 */
		deleteB: function () {
			current.spin('delete');
			$.ajax({
				type: 'DELETE',
				url: REST_PATH + 'system/bench',
				dataType: 'json',
				success: function (data) {
					_('delete').val(data.duration);
					current.spinOff();
				},
				error: function () {
					current.spinOff();
				}
			});
		}
	};
	return current;
});
