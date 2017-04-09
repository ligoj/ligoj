package org.ligoj.app.resource.welcome;

import java.util.Arrays;
import java.util.List;

import org.ligoj.app.api.FeaturePlugin;
import org.ligoj.app.iam.model.DelegateOrg;
import org.ligoj.app.model.DelegateNode;
import org.ligoj.bootstrap.model.system.SystemAuthorization;
import org.ligoj.bootstrap.model.system.SystemRole;
import org.ligoj.bootstrap.model.system.SystemRoleAssignment;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.springframework.stereotype.Component;

/**
 * Initialize during the RBAC data on installation.
 */
@Component
public class InitializeRbacDataResource implements FeaturePlugin {

	@Override
	public String getKey() {
		return "feature:welcome:data-rbac";
	}

	@Override
	public List<Class<?>> getInstalledEntities() {
		return Arrays.asList(SystemUser.class, SystemRole.class, SystemAuthorization.class, SystemRoleAssignment.class, DelegateOrg.class,
				DelegateNode.class);
	}

}
