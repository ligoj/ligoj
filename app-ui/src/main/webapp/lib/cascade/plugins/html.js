/**
 * The HTML file will be loaded and compiled with Handlebars and i18n messages if loaded.
 * Injected context :
 * <ul>
 * <li>$template : The compiled template HTML. Corresponds to the loaded text compiled by Handlbars.</li>
 * <li>$view : The jQUery view processed by Handlbars and i18n messages. The view is also inserted into the right hierarchy position.
 * This view will be emptied during the unload</li>
 * <li>$siblings : Contains the siblings loaded modules. Used only in case of a non hierarchical loading mode.
 * This mode is autmatically used when the natural hierarchy DOM cannot be found</li>
 * <li>$page : The container context owning this context. Note this is not really the $parent since the $page has no hierarchical
 * relationship with the current context. When "$page" is defined, this context will be present in the inverse relationship
 * "$page.$siblings".</li>
 * <li>$child : In hierarchy mode, corresponds to the context placed in the next hierarchy level. When defined, the two way relationship is
 * always true : "this.$child.$parent === this"</li>
 * </ul>
 * Accepted options:
 * <ul>
 * 	<li> {function} viewBuilder :  Builder function replacing the default view built from template and messages.
 *	When defined, the function will be called with the newly created context with
 *	"$template" already injected in the created context.
 *	The result will be placed in the parent view  and injected into the context as
 *	$view.
 * </li>
 *   <li>
 *	{jQuery} $parentElement : Parent jQUery that will directly contains the view and would become the new
 *	view of this load.
 *	When undefined, the created view will be inside the previous container's view
 *	inside a wrapper with an unique identifier based on home and the formal
 *	parameter "id". In this case, the parent view may contains several siblings
 *	having the view as container.
 *	</li><li>
 *	{boolean} reload    :     When "true" the previous identical view is removed, along the CSS and controller
 *	before this new load.
 *	The match is based on the built identifier placed in the view.
 *	</li>
 * </ul>
 */
define([], function () {
	var $self = {

		/**
		 * The default view builder to use to build the view from the given context.
		 * @param  {object} context     The current context with injected '$messages', and ''$template'
		 * @return {string}             The string representing the view code to associate to the context and to inject in the correct place in the
		 *                              parent.
		 */
		viewBuilder: function (context) {
			return context.$template ? context.$template(context.$messages) : '';
		},

		/**
		 * Return the nested hierarchical container inside the view of current context. The used CSS selector (where X corresponds to hdindex) used to resolve this parent will be:
		 * #_hierarchy-X,[data-cascade-hierarchy=X],.data-cascade-hierarchy-X
		 * @param  {object} context The context to complete.
		 * @param  {integer} hindex Optional hierarchical index to lookup. When undefined, will use the one of provided context plus one.
		 * @return {jquery}         A jQuery object of the found element. Only the first match is returned.
		 */
		findNextContainer: function (context, hindex) {
			hindex = hindex || context.$hindex + 1;
			return context.$view.find('#_hierarchy-' + hindex + ',[data-cascade-hierarchy="' + hindex + '"],.data-cascade-hierarchy-' + hindex).first();
		},
		load: {
			require: function (options) {
				return 'text!' + options.home + '/' + options.id + '.html';
			},
			controller: function (template, options, $current) {
				var context = options.context;

				// Find the right UI parent
				var $parentElement = options.$parentElement;
				var createdSibling = false;
				var siblingMode = false;
				if (((typeof $parentElement) !== 'object' || $parentElement.length === 0) && options.hindex >= 0) {
					$parentElement = $self.findNextContainer(context, options.hindex);
				}

				// Clean the resolution and reject empty parent
				if ((typeof $parentElement) !== 'object' || $parentElement.length === 0) {
					// No valid parent found, we will add the new UI inside the context's view as a wrapped child node
					var viewId = '_module-' + options.base;
					siblingMode = true;
					$parentElement = _(viewId);
					if ($parentElement.length === 0) {
						// Create the wrapper
						createdSibling = true;
						$parentElement = $('<div id="' + viewId + '"></div>');
						context.$view.append($parentElement);
					}
				}
				options.siblingMode = siblingMode;

				// Complete the hierarchy
				if (siblingMode) {
					// Include without adding an element in the hierarchy, title is unchanged
					$current.$page = context.$page || context;
					context.$siblings.push($current);
				} else {
					// Share this context
					$current.$cascade.$current = $current;
					context.$child = $current;
				}

				// Clean the previous state
				if (options.reload) {
					// Invalidate the previous view
					$parentElement.empty();
				} else if (siblingMode && !createdSibling) {
					// Call only the callback, nothing has been unloaded or created
					options.callback && options.callback($current);
					return true;
				}

				$current.$view = $parentElement;
				$current.$template = template && Handlebars.compile(template);
				$current.$view.off().empty().html((options.viewBuilder || $self.viewBuilder)($current));
			}
		},
		unload: {
			controller: function (module, context) {
				context.$view && $.contains(document.documentElement, context.$view[0]) && context.$view.off().empty();
			}
		}
	};
	return $self;
});
