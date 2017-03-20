package org.ligoj.app.resource.security;

import java.util.ArrayList;
import java.util.Collection;

import javax.cache.annotation.CacheResult;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import org.ligoj.app.iam.IamConfiguration;
import org.ligoj.app.iam.IamConfigurationProvider;
import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.plugin.id.resource.IdentityServicePlugin;
import org.ligoj.app.resource.ServicePluginLocator;

import lombok.extern.slf4j.Slf4j;

/**
 * Identity and Access Management provider based on node. A primary node is used to fetch user details. The secondary
 * provider can authenticate some users before the primary, when their login is accepted.
 */
@Component
@Slf4j
public class NodeBasedIamProvider implements IamProvider {

	/**
	 * Secondary user nodes.
	 */
	@Value("#{'${iam.secondary}'.split(',')}")
	protected Collection<String> secondary = new ArrayList<>();

	/**
	 * Secondary user nodes.
	 */
	@Value("${iam.primary}")
	protected String primary;

	@Autowired
	protected ServicePluginLocator servicePluginLocator;

	@Override
	public Authentication authenticate(final Authentication authentication) throws Exception {

		// Determine the right provider to authenticate among the IAM nodes
		for (final String nodeId : secondary) {
			final IdentityServicePlugin resource = servicePluginLocator.getResource(nodeId, IdentityServicePlugin.class);
			if (resource == null) {
				// Ignore IAM provider not found
				log.info("IAM node {} does not exist", nodeId);
			} else if (resource.accept(authentication, nodeId)) {
				// IAM provider has been found, use it for this authentication
				return resource.authenticate(authentication, nodeId, false);
			}
		}

		// Primary authentication
		return servicePluginLocator.getResource(primary, IdentityServicePlugin.class).authenticate(authentication, primary, true);
	}

	@Override
	@CacheResult(cacheName = "iam-node-configuration")
	public IamConfiguration getConfiguration() {
		return ((IamConfigurationProvider) servicePluginLocator.getResourceExpected(primary, IdentityServicePlugin.class)).getConfiguration(primary);
	}

}
