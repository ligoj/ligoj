package org.ligoj.app.resource.project;

import java.util.Collection;

import org.ligoj.app.resource.subscription.SubscriptionVo;
import lombok.Getter;
import lombok.Setter;

/**
 * A fully described project.
 */
@Getter
@Setter
public class ProjectVo extends BasicProjectVo {

	private Collection<SubscriptionVo> subscriptions;

	/**
	 * Indicates the current user can manage the subscriptions of this project.
	 */
	private boolean manageSubscriptions;
}
