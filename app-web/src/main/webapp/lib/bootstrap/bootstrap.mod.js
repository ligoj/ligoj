define([
	'jquery', 'cascade', 'bootstrap'
], function ($, $cascade) {
	// Global handler for better bootstrap implicit experience
	$('body').popover({selector: '[data-toggle="popover"]:not([data-trigger="manual"])', html: 'true', trigger: 'hover focus', container: 'body'});
	$('body').tooltip({selector: '[data-toggle="tooltip"]:not([data-trigger="manual"])', html: 'true', trigger: 'hover focus', container: 'body'});
	$(document).on('click', '.toggle-visibility', function () {
		$(this).toggleClass('active');
	}).on('click', '.disabled,[disabled]', function (event) {
		event.preventDefault();
	}).on('click', '[data-toggle="popover"][data-trigger="manual"]', function () {
		$(this).popover('toggle');
	}).on('mousedown', function (e) {
		// Auto hide popover on click
		if ($('.popover.in').length && $(e.target).closest('[data-toggle="popover"],.popover').length === 0) {
			$('.popover.in').each(function () {
				$('[aria-describedby="' + $(this).attr('id') + '"]').popover('hide');
			});
		}
	}).on('change', '.btn-file :file', function () {
		var $input = $(this);
		var label = $input.val().replace(/\\/g, '/').replace(/.*\//, '');
		$input.parents('.input-group').find(':text').val(label);
		// FIX : #19192 ->
	}).off('click.bs.button.data-api', '[data-toggle^="button"]').on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
		var $btn = $(e.target).closest('.btn').button('toggle');
		if (!($(e.target).is('input[type="radio"]') || $(e.target).is('input[type="checkbox"]'))) {
			// Prevent double click on radios, and the double selections (so cancellation) on checkboxes
			e.preventDefault();
			// The target component still receive the focus
			if ($btn.is('input,button')) {
				$btn.trigger('focus');
			} else {
				$btn.find('input:visible,button:visible').first().trigger('focus');
			}
		}
	}).on('click', '.retract', function () {
		$(this).closest('.retractable').toggleClass('retracted');
	}).on('keypress', 'form:not([method]),[method="get"],form[method="GET"]', function (e) {
		// Some browser (like Chrome) the first submit is used (hidden or not) and receive a click
		if ((e.which === 13 || e.keyCode === 13) && !$(e.target).is('textarea')) {
			// Determines the right input
			var $button = $(this).find('input:visible[type=submit]:not(.disabled):not(.hide):not(.hidden):not([disabled]),button:visible[type=submit]:not(.disabled):not(.hide):not(.hidden):not([disabled])').first();
			if ($button.length) {
				$button.trigger('click');
				e.preventDefault();
				return false;
			}
		}
	}).on('submit', 'form:not([method]),[method="get"],form[method="GET"]', function (e) {
		e.preventDefault();
	}).on('show.bs.tab', 'a[data-toggle="tab"]', function () {
		// Load active partials for tab
		var $target = $($(this).attr('href'));
		if ($target.is('[data-ajax]')) {
			$.proxy($cascade.loadPartial, $target)();
		}
	}).on('show.bs.collapse', '.collapse[data-ajax]',
	// Load active partials for collapse
	$cascade.loadPartial).on('show.bs.popover', '[data-ajax]',
	// Load active partials for popover
	$cascade.loadPartial).on('show.bs.modal', '.modal[data-ajax]',
	// Load active partials for modal
	$cascade.loadPartial);

	$.fn.hideGroup = function () {
		$(this).closest('.form-group').addClass('hidden');
		return this;
	};
	$.fn.showGroup = function () {
		$(this).closest('.form-group').removeClass('hidden');
		return this;
	};
	$.fn.rawText = function (rawText) {
		// Get text mode
		if (typeof rawText === 'undefined') {
			var text = this.first().contents().filter(function () {
				return this.nodeType === 3;
			});
			return text.length ? text[0].textContent || '' : '';
		}
		// Set text
		this.each(function () {
			var text = $(this).contents().filter(function () {
				return this.nodeType === 3;
			});
			if (rawText && text.length === 0) {
				// Create a new text node at the end
				$(this).append(document.createTextNode(rawText));
			} else {
				// Replace the content of existing node
				text.each(function () {
					this.textContent = rawText;
				});
			}
		});
		return this;
	};

	function selectMenu() {
		var selector = $(this).closest('li');
		// Check there is not yet selected child
		if (selector.parents('.navbar,.nav-pills.nav-stacked').find('li.active').length === 0) {
			selector.addClass('active');
			$.fn.collapse && selector.parents('.navbar').length === 0 && selector.parents('.collapse').collapse('show');
			selector.parents('.dropdown').addClass('active');
		}
	}

	/**
	 * Synchronize the menu with the URL of the context url
	 * @param  {string} url Current url to synchronize with menus.
	 */
	function synchronizeMenu(url) {
		var patterns = [];
		var fragments = url.split('/');
		do {
			patterns.push('a[href^="' + fragments.join('/').replace(/"/g, '\\"') + '"]');
			fragments.pop();
		} while (fragments.length);
		var base = _('_main').find('.navbar,.nav-pills.nav-stacked');

		// Remove all highlights
		base.find('li.active').removeClass('active');

		// Highlight tool bar menu
		for (var index = 0; index < patterns.length; index++) {
			base.find(patterns[index]).each(selectMenu);
		}
	}

	// Transformation
	$cascade.register('html', function (selector) {
		// Add popover feature
		selector.find('.tab-pane.active[data-ajax]').each($cascade.loadPartial);
	});
	$cascade.register('hash', function (url) {
		$('.modal-backdrop').remove();
		$('.tooltip').remove();
		$('.popover').remove();
		synchronizeMenu(url);
	});


	/**
	 * Full screen management : enter full screen
	 * @param {Object} $selector Optional selector.
	 */
	$.fn.fullscreen = function() {
		var el = $(this)[0] || document.documentElement;

		// use necessary prefixed versions
		if (el.webkitRequestFullscreen) {
			el.webkitRequestFullscreen();
			return;
		}
		if (el.mozRequestFullScreen) {
			el.mozRequestFullScreen();
			return;
		}
		if (el.msRequestFullscreen) {
			el.msRequestFullscreen();
			return;
		}
		// finally the standard version
		el.requestFullscreen && el.requestFullscreen();
	};

	/**
	 * Exit full screen management
	 */
	$.fn.exitFullscreen = function() {
		// use necessary prefixed versions
		if (document.webkitExitFullscreen) {
			document.webkitCancelFullScreen();
			return;
		}
		if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
			return;
		}
		if (document.msExitFullscreen) {
			document.msExitFullscreen();
			return;
		}
		// finally the standard version
		document.exitFullscreen && document.exitFullscreen();
	};

});
