/*
 * BOOSTRAP PLUGIN ===============
 */
! function($) {

	/*
	 * SideBarTree PUBLIC CLASS DEFINITION ===================================
	 */

	var SideBarTree = function(element, options) {
		this.$element = $(element);
		this.options = $.extend(true, {}, $.fn.sidebartree.defaults, options);
	};

	SideBarTree.prototype = {
		/**
		 * load a node
		 */
		loadNode : function(container, identifier) {
			var $this = this;
			// call ajax url to load the tree node
			$.ajax({
				type : 'GET',
				url : this.options.ajaxUrl + ( identifier ? "/" + identifier : ''),
				dataType : 'json',
				async : false,
				success : function(nodes) {
					// create master ul tag
					var ul = $('<ul>').addClass('nav nav-pills nav-stacked').appendTo(container),
					    idx;
					for ( idx = 0; idx < nodes.length; idx++) {
						$this.options.renderer($this, ul, nodes[idx]);
					}
				}
			});
		},

		/**
		 * initialization method
		 */
		init : function() {
			this.loadNode(this.$element.context);
		}
	};

	/*
	 * SideBarTree PLUGIN DEFINITION =============================
	 */
	$.fn.sidebartree = function(option) {
		return this.each(function() {
			var $this = $(this),
			    options = typeof option === 'object' && option,
				data = new SideBarTree($this, options);
			$this.data('sidebartree', data);
			data.init();
		});
	};

	// Default values
	$.fn.sidebartree.defaults = {
		'properties' : {
			id : 'id',
			name : 'name',
			hasChildren : 'hasChildren'
		},
		'rendererCallback' : null
	};
	$.fn.sidebartree.defaults.renderer = function($this, ul, currentNode) {
		var li = $('<li>').appendTo(ul);
		var currentNodeId = currentNode[$this.options['properties']['id']];
		var currentNodeName = currentNode[$this.options['properties']['name']];
		var hasChildren = currentNode[$this.options['properties']['hasChildren']];
		var link;
		if (hasChildren) {
			// if node has children, we must manage collapse and children loading
			link = $('<a>').addClass('collapsed').attr('data-toggle', 'collapse').addClass('openable').attr('href', '#' + currentNodeId).appendTo(li);
			$('<b>').addClass('caret').appendTo(link);
			$('<span>').appendTo(link).html(currentNodeName);
			var newContainer = $('<div>').attr('id', currentNodeId).addClass('collapse').appendTo(li);
			link.click( function(newContainer, currentNodeId) {
				return function() {
					if (newContainer.children().length === 0) {
						$this.loadNode(newContainer, currentNodeId);
					}
				};
			}(newContainer, currentNodeId));
		} else {
			// if node has no child, we must manage it as a link
			link = $('<a>').attr('data-toggle', 'tab').attr('href', '#' + currentNodeId).appendTo(li).html(currentNodeName);
			link.click(function() {
				$this.$element.find('.active').removeClass('active');
			});
		}

		// Callback for rendered item
		$this.options.rendererCallback && $this.options.rendererCallback(currentNode, link);
	};
	$.fn.sidebartree.Constructor = SideBarTree;

}(window.jQuery);
