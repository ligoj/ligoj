/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
define({
	"root" : {
		"title" : "Project",
		"configure" : "Configure",
		"configure-present" : "Configure (has configuration)",
		"pkey" : "Key",
		"internal-key" : "Internal key",
		"manager" : "Manager",
		"subscribe" : "Subscribe",
		"unsubscribe" : "Delete this subscription from the portal, not from the tool. This is the exact reverse operation a subscription in link mode.",
		"confirm-unsubscribe" : "Deleting this subscription will only remove the link between the tool and this project. This link can be rebuilt later.",
		"delete-subscription" : "Delete this subscription from the portal, and also from the remote instance. This option is available since this subscription has been created in 'create' mode. A confirmation is expected.",
		"confirm-delete-subscription" : "Deleting this subscription will remove the link between the tool and this project, and also destroy the remote data (group, project, etc.) in the tool. This operation cannot be undone.",
		"subscription-state-up" : "Checked subscription",
		"subscription-state-down" : "Subscription is either invalid either broken",
		"subscription-state-unknown" : "Subscription is in an unknown state",
		"nb-subscriptions" : "Amount of subscriptions",
		"group-by" : "Group subscriptions by affinity",
		"group-by-none" : "None",
		"group-by-auto" : "Auto",
		"group-by-other" : "Other",
		"error" : {
			"Validation" : "Invalid parameters set",
			"not-accepted-parameter" : "Unexpected parameter {{this}}"
		},
		"warn" : {
			"subscription-deletion" : "For now, subscriptions cannot be edited."
		}
	},
	"fr" : true
});
