package org.ligoj.app.resource.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import javax.transaction.Transactional;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.app.iam.IamConfiguration;
import org.ligoj.app.model.DelegateNode;
import org.ligoj.app.model.Event;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.app.plugin.id.resource.IdentityServicePlugin;
import org.ligoj.app.resource.AbstractServerTest;
import org.ligoj.app.resource.ServicePluginLocator;

/**
 * Test class of {@link NodeBasedIamProvider}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class NodeBasedIamProviderTest extends AbstractServerTest {

	@Autowired
	private NodeBasedIamProvider resource;

	@Before
	public void prepareSubscription() throws IOException {
		persistEntities("csv/app-test",
				new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class, Event.class, DelegateNode.class },
				StandardCharsets.UTF_8.name());
	}

	@Test
	public void authenticate() throws Exception {
		final Authentication authentication = new UsernamePasswordAuthenticationToken("fdaugan", "Azerty01");
		Assert.assertSame(authentication, resource.authenticate(authentication));
	}

	@Test
	public void authenticatePrimary() throws Exception {
		final NodeBasedIamProvider provider = new NodeBasedIamProvider();
		provider.primary = "some";
		provider.secondary = Collections.singletonList("any");
		provider.servicePluginLocator = Mockito.mock(ServicePluginLocator.class);
		final Authentication authentication = new UsernamePasswordAuthenticationToken("fdaugan", "Azerty01");
		final IdentityServicePlugin servicePlugin = Mockito.mock(IdentityServicePlugin.class);
		Mockito.when(provider.servicePluginLocator.getResource("any", IdentityServicePlugin.class)).thenReturn(null);
		Mockito.when(provider.servicePluginLocator.getResource("some", IdentityServicePlugin.class)).thenReturn(servicePlugin);
		Mockito.when(servicePlugin.authenticate(authentication, "some", true)).thenReturn(authentication);
		Assert.assertSame(authentication, provider.authenticate(authentication));
	}

	@Test
	public void authenticateSecondary() throws Exception {
		final NodeBasedIamProvider provider = new NodeBasedIamProvider();
		provider.secondary = Collections.singletonList("other");
		provider.servicePluginLocator = Mockito.mock(ServicePluginLocator.class);
		final Authentication authentication = new UsernamePasswordAuthenticationToken("fdaugan", "Azerty01");
		final Authentication authentication2 = new UsernamePasswordAuthenticationToken("other", "");
		final IdentityServicePlugin servicePlugin = Mockito.mock(IdentityServicePlugin.class);
		Mockito.when(servicePlugin.authenticate(authentication, "other", false)).thenReturn(authentication2);
		Mockito.when(servicePlugin.accept(authentication, "other")).thenReturn(true);
		Mockito.when(provider.servicePluginLocator.getResource("other", IdentityServicePlugin.class)).thenReturn(servicePlugin);
		Assert.assertSame(authentication2, provider.authenticate(authentication));
	}

	@Test
	public void getConfiguration() {
		final IamConfiguration configuration = resource.getConfiguration();
		Assert.assertNotNull(configuration.getCompanyRepository());
		Assert.assertNotNull(configuration.getGroupRepository());
		Assert.assertNotNull(configuration.getUserRepository());
	}
}
