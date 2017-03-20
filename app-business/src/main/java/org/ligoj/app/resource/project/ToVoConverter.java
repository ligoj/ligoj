package org.ligoj.app.resource.project;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.ligoj.bootstrap.core.DescribedBean;
import org.ligoj.app.api.NodeStatus;
import org.ligoj.app.ldap.resource.UserLdapResource;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.app.resource.node.EventVo;
import org.ligoj.app.resource.node.NodeResource;
import org.ligoj.app.resource.node.ParameterValueResource;
import org.ligoj.app.resource.node.ParameterValueVo;
import org.ligoj.app.resource.subscription.SubscriptionVo;

/**
 * JPA {@link Project} to detailed {@link ProjectVo} converter.
 */
class ToVoConverter implements Function<Project, ProjectVo> {

	/**
	 * Subscriptions.
	 */
	private List<Object[]> subscriptions;

	/**
	 * subscriptions status
	 */
	private Map<Integer, EventVo> subscriptionStatus;

	protected ToVoConverter(final List<Object[]> subscriptions, final Map<Integer, EventVo> subscriptionStatus) {
		this.subscriptions = subscriptions;
		this.subscriptionStatus = subscriptionStatus;
	}

	@Override
	public ProjectVo apply(final Project entity) {
		final ProjectVo vo = new ProjectVo();
		vo.copyAuditData(entity, UserLdapResource.TO_LDAP_CONVERTER);
		DescribedBean.copy(entity, vo);
		vo.setPkey(entity.getPkey());
		vo.setTeamLeader(UserLdapResource.TO_LDAP_CONVERTER.apply(entity.getTeamLeader()));

		// Build the subscriptions
		final Map<Integer, SubscriptionVo> subscriptions = new LinkedHashMap<>();
		for (final Object[] resultSet : this.subscriptions) {
			final Subscription subscriptionEntity = (Subscription) resultSet[0];
			SubscriptionVo subscriptionVo = subscriptions.get(subscriptionEntity.getId());

			// Build the subscription root instance
			if (subscriptionVo == null) {
				subscriptionVo = new SubscriptionVo();
				subscriptionVo.copyAuditData(subscriptionEntity, UserLdapResource.TO_LDAP_CONVERTER);
				subscriptionVo.setId(subscriptionEntity.getId());
				subscriptionVo.setNode(NodeResource.toVo(subscriptionEntity.getNode()));
				subscriptionVo.setParameters(new HashMap<>());
				subscriptions.put(subscriptionEntity.getId(), subscriptionVo);

				// Add subscription status
				final EventVo lastEvent = subscriptionStatus.get(subscriptionEntity.getId());
				if (lastEvent != null) {
					subscriptionVo.setStatus(NodeStatus.valueOf(lastEvent.getValue()));
				}
			}

			// Add subscription value
			final ParameterValue parameterValue = (ParameterValue) resultSet[1];
			subscriptionVo.getParameters().put(parameterValue.getParameter().getId(),
					ParameterValueResource.parseValue(parameterValue, new ParameterValueVo()));

		}
		vo.setSubscriptions(subscriptions.values());
		return vo;
	}
}
