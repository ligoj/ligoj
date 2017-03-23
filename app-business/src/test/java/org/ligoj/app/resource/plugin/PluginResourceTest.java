package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.transaction.Transactional;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.app.AbstractAppTest;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;

/**
 * Test class of {@link PluginResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class PluginResourceTest extends AbstractAppTest {

	@Autowired
	private PluginResource resource;

	@Before
	public void prepareData() throws IOException {
		persistEntities("csv/app-test", new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class },
				StandardCharsets.UTF_8.name());
	}

	@Test
	public void findAll() {
		final List<PluginVo> plugins = resource.findAll();
		Assert.assertEquals(2, plugins.size());
		Assert.assertEquals("service:id", plugins.get(0).getId());
		Assert.assertNull(plugins.get(0).getName());
		Assert.assertNull(plugins.get(0).getVendor());
		Assert.assertNull(plugins.get(0).getVersion());
		Assert.assertEquals(2, plugins.get(0).getNodes());
		Assert.assertEquals(2, plugins.get(0).getSubscriptions());
		Assert.assertFalse(plugins.get(0).isTool());

		Assert.assertEquals("service:id:ldap", plugins.get(1).getId());
		Assert.assertNull(plugins.get(1).getName());
		Assert.assertNull(plugins.get(1).getVendor());
		Assert.assertNull(plugins.get(1).getVersion());
		Assert.assertEquals(1, plugins.get(1).getNodes());
		Assert.assertEquals(2, plugins.get(1).getSubscriptions());
		Assert.assertTrue(plugins.get(1).isTool());
	}

	@Test
	public void manifestData() {
		Assert.assertTrue(Integer.class.getPackage().getImplementationVersion().startsWith("1.8"));
		Assert.assertEquals("1.8", Integer.class.getPackage().getSpecificationVersion());
		Assert.assertEquals("Java Runtime Environment", Integer.class.getPackage().getImplementationTitle());

		// Oracle Corporation
		Assert.assertNotNull(Integer.class.getPackage().getImplementationVendor());
	}
}
