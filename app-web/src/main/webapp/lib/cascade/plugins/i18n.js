/**
 * The internationalization files will be loaded and merged with the messages from the parent
 * hierarchy of context using LIFO priority for resolution.
 */
define([], function () {
	var $self = {

		/**
		 * Build an extended messages from the given messages and the parent messages discovered in the
		 * provided context.
		 */
		buildMessages: function (context, rawMessages) {
			var parentMessages = {};

			// Get the previously
			if (context.$parent) {
				parentMessages = context.$parent.$mergedMessages || {};
				// Propagate the messages to parent
				$self.propagateMessages(context.$parent, rawMessages);
			}

			// Create the messages merged from parents and future children. No injected context.
			context.$mergedMessages = {};
			$.extend(true, context.$mergedMessages, parentMessages, rawMessages);

			// Create the final merged messages and would contains injected context.
			var messages = {};
			context.$messages = messages;
			$.extend(true, messages, context.$mergedMessages);

			// Complete the messages with the context
			messages.$current = context;
			messages.$cascade = $self;

			// Share these finest messages
			$self.$cascade.$messages = messages;
		},

		propagateMessages: function (context, messages) {
			$.extend(true, context.$messages, messages);
			context.$parent && $self.propagateMessages(context.$parent, messages);
		},
		load: {
			require: function (options) {
				return 'i18n!' + options.home + '/nls/messages';
			},
			controller: function (messages, options, $current) {
				// Build the messages with inheritance
				$self.buildMessages($current, messages || {});
				if (!options.siblingMode && $current.$messages.title) {
					// Title has been redefined at this level
					document.title = $current.$messages.title;
				}
			}
		}
	};
	return $self;
});
