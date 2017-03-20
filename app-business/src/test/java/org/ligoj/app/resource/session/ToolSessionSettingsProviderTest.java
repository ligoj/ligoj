package org.ligoj.app.resource.session;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.transaction.Transactional;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.AdditionalAnswers;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.bootstrap.core.SpringUtils;
import org.ligoj.bootstrap.resource.system.session.SessionResource;
import org.ligoj.bootstrap.resource.system.session.SessionSettings;
import org.ligoj.app.AbstractJpaTest;
import org.ligoj.app.api.NodeVo;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import net.sf.ehcache.CacheManager;

/**
 * Test of {@link ToolSessionSettingsProvider}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@Rollback
public class ToolSessionSettingsProviderTest extends AbstractJpaTest {

	@Before
	public void prepareData() throws IOException {
		// Only with Spring context
		persistEntities("csv/app-test", new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class },
				StandardCharsets.UTF_8.name());
		CacheManager.getInstance().getCache("ldap").removeAll();
		CacheManager.getInstance().getCache("ldap-user-repository").removeAll();

		// For the cache to be created
		getUser().findAll();
	}

	@Autowired
	private ToolSessionSettingsProvider provider;

	@Autowired
	private SessionResource resource;

	@SuppressWarnings("unchecked")
	@Before
	public void mockApplicationContext() {
		final ApplicationContext applicationContext = Mockito.mock(ApplicationContext.class, AdditionalAnswers.delegatesTo(super.applicationContext));
		SpringUtils.setSharedApplicationContext(applicationContext);
		Mockito.doAnswer(invocation -> {
			final Class<?> requiredType = (Class<Object>) invocation.getArguments()[0];
			if (requiredType == SessionSettings.class) {
				return new SessionSettings();
			}
			return ToolSessionSettingsProviderTest.super.applicationContext.getBean(requiredType);
		}).when(applicationContext).getBean(ArgumentMatchers.any(Class.class));
	}

	@Test
	public void decorate() {
		initSpringSecurityContext("fdaugan");
		final SessionSettings details = resource.details();
		provider.decorate(details);
		Assert.assertEquals(Boolean.TRUE, details.getUserSettings().get("internal"));
		@SuppressWarnings({ "unchecked", "rawtypes" })
		final List<Map<String, Object>> globalTools = (List) details.getUserSettings().get("globalTools");
		Assert.assertEquals(1, globalTools.size());
		final NodeVo node = (NodeVo) globalTools.get(0).get("node");
		Assert.assertEquals("service:km:confluence:dig", node.getId());
		Assert.assertEquals("Confluence Gfi", node.getName());
		Assert.assertEquals(3, node.getParameters().size());
		Assert.assertEquals("http://localhost:8120", node.getParameters().get("service:km:confluence:url"));
	}

	/**
	 * Invalid JSon in tool configuration.
	 */
	@Test
	public void decorateError() {
		initSpringSecurityContext("fdaugan");
		final SessionSettings details = new SessionSettings();
		details.setUserSettings(new HashMap<>());
		final ToolSessionSettingsProvider resource = new ToolSessionSettingsProvider();
		applicationContext.getAutowireCapableBeanFactory().autowireBean(resource);
		resource.globalToolsInternal = "{error}";
		resource.decorate(details);
		Assert.assertNull(details.getUserSettings().get("globalTools"));
	}

	@SuppressWarnings("rawtypes")
	@Test
	public void decorateExternal() {
		initSpringSecurityContext("wuser");
		final SessionSettings details = resource.details();
		provider.decorate(details);
		Assert.assertEquals(Boolean.TRUE, details.getUserSettings().get("external"));
		Assert.assertTrue(((Collection) details.getUserSettings().get("globalTools")).isEmpty());
	}

}
