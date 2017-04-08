package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

import javax.transaction.Transactional;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.ligoj.app.AbstractAppTest;
import org.ligoj.app.api.FeaturePlugin;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.PluginRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Plugin;
import org.ligoj.app.model.PluginType;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.bootstrap.core.resource.BusinessException;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.ligoj.bootstrap.model.system.SystemBench;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

/**
 * Test class of {@link PluginResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class PlugInResourceTest extends AbstractAppTest {

	@Autowired
	private PluginResource resource;

	@Autowired
	private PluginRepository repository;

	@Autowired
	private NodeRepository nodeRepository;

	@Before
	public void prepareData() throws IOException {
		persistEntities("csv", new Class[] { Node.class, Project.class, Subscription.class }, StandardCharsets.UTF_8.name());
	}

	@Test
	public void findAll() {
		// Add some plug-ins
		final Plugin pluginId = new Plugin();
		pluginId.setKey("service:sample");
		pluginId.setType(PluginType.SERVICE);
		pluginId.setVersion("1.0");
		repository.saveAndFlush(pluginId);
		((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleService", new SampleService());

		final Plugin pluginIdLdap = new Plugin();
		pluginIdLdap.setKey("service:sample:tool");
		pluginIdLdap.setType(PluginType.TOOL);
		pluginIdLdap.setVersion("1.1");
		repository.saveAndFlush(pluginIdLdap);
		((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleTool", new SampleTool());

		final List<PluginVo> plugins = resource.findAll();
		Assert.assertEquals(3, plugins.size());

		final PluginVo plugin0 = plugins.get(0);
		Assert.assertEquals("feature:iam:empty", plugin0.getId());
		Assert.assertEquals("IAM Void", plugin0.getName());
		Assert.assertEquals("Gfi Informatique", plugin0.getVendor());
		Assert.assertTrue(plugin0.getLocation().endsWith(".jar"));
		Assert.assertNotNull(plugin0.getPlugin().getVersion());
		Assert.assertNull(plugin0.getNode());
		Assert.assertEquals(0, plugin0.getNodes());
		Assert.assertEquals(0, plugin0.getSubscriptions());
		Assert.assertEquals(PluginType.FEATURE, plugin0.getPlugin().getType());

		final PluginVo plugin1 = plugins.get(1);
		Assert.assertEquals("service:sample", plugin1.getId());
		Assert.assertEquals("Sample", plugin1.getName());
		Assert.assertNull(plugin1.getVendor());
		Assert.assertFalse(plugin1.getLocation().endsWith(".jar"));
		Assert.assertEquals("1.0", plugin1.getPlugin().getVersion());
		Assert.assertEquals("service:sample", plugin1.getNode().getId());
		Assert.assertEquals(3, plugin1.getNodes());
		Assert.assertEquals(3, plugin1.getSubscriptions());
		Assert.assertEquals(PluginType.SERVICE, plugin1.getPlugin().getType());

		final PluginVo plugin2 = plugins.get(2);
		Assert.assertEquals("service:sample:tool", plugin2.getId());
		Assert.assertEquals("Tool", plugin2.getName());
		Assert.assertNull(plugin2.getVendor());
		Assert.assertFalse(plugin2.getLocation().endsWith(".jar"));
		Assert.assertEquals("1.1", plugin2.getPlugin().getVersion());
		Assert.assertEquals("service:sample:tool", plugin2.getNode().getId());
		Assert.assertEquals(2, plugin2.getNodes());
		Assert.assertEquals(3, plugin2.getSubscriptions());
		Assert.assertEquals(PluginType.TOOL, plugin2.getPlugin().getType());
	}

	@Test
	public void configurePluginInstall() {
		final SampleService service1 = new SampleService();
		resource.configurePluginInstall(service1);
		Assert.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assert.assertEquals(PluginType.SERVICE, repository.findByExpected("key", "service:sample").getType());
		Assert.assertNotNull(repository.findByExpected("key", "service:sample").getVersion());

		final SampleTool service2 = new SampleTool();
		resource.configurePluginInstall(service2);
		Assert.assertEquals("Tool", nodeRepository.findOneExpected("service:sample:tool").getName());
		Assert.assertEquals(PluginType.TOOL, repository.findByExpected("key", "service:sample:tool").getType());
		Assert.assertNotNull(repository.findByExpected("key", "service:sample:tool").getVersion());
	}

	@Test
	public void configurePluginInstallManagedEntities() {
		final ServicePlugin service1 = Mockito.mock(ServicePlugin.class);
		Mockito.when(service1.getKey()).thenReturn("service:sample");
		Mockito.when(service1.getInstalledEntities()).thenReturn(Arrays.asList(Node.class, SystemBench.class));
		em.createQuery("DELETE Subscription").executeUpdate();
		em.createQuery("DELETE Node").executeUpdate();

		resource.configurePluginInstall(service1);
		Assert.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assert.assertEquals(PluginType.SERVICE, repository.findByExpected("key", "service:sample").getType());
		Assert.assertNotNull(repository.findByExpected("key", "service:sample").getVersion());

		// Check the managed entity is persisted
		Assert.assertEquals(1, em.createQuery("FROM SystemBench WHERE prfChar=?").setParameter(0, "InitData").getResultList().size());
	}

	@Test(expected = TechnicalException.class)
	public void configurePluginInstallError() {
		final FeaturePlugin service1 = Mockito.mock(FeaturePlugin.class);
		Mockito.when(service1.getInstalledEntities()).thenThrow(BusinessException.class);
		resource.configurePluginInstall(service1);
	}

	@Test
	public void manifestData() {
		Assert.assertTrue(Integer.class.getPackage().getImplementationVersion().startsWith("1.8"));
		Assert.assertEquals("1.8", Integer.class.getPackage().getSpecificationVersion());
		Assert.assertEquals("Java Runtime Environment", Integer.class.getPackage().getImplementationTitle());

		// Oracle Corporation
		Assert.assertNotNull(Integer.class.getPackage().getImplementationVendor());
	}

	@Test
	public void configurePluginUpdate() {
		final SampleService service1 = new SampleService();
		final Plugin plugin = new Plugin();
		plugin.setVersion("old version");
		resource.configurePluginUpdate(service1, plugin);
		Assert.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assert.assertNotNull("1.0", plugin.getVersion());
	}

	@Test(expected = TechnicalException.class)
	public void configurePluginUpdateError() {
		final Plugin plugin = new Plugin();
		plugin.setVersion("old version");
		final FeaturePlugin service1 = Mockito.mock(FeaturePlugin.class);
		Mockito.when(service1.getInstalledEntities()).thenThrow(BusinessException.class);
		resource.configurePluginUpdate(service1, plugin);
		Assert.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assert.assertNotNull("1.0", plugin.getVersion());
	}
	
	@Test
	public void determinePluginType() {
		Assert.assertEquals(PluginType.SERVICE, resource.determinePluginType(new SampleService()));
		Assert.assertEquals(PluginType.TOOL, resource.determinePluginType(new SampleTool()));
	}
	
	@Test(expected = TechnicalException.class)
	public void determinePluginTypeError() {
		final ServicePlugin service1 = Mockito.mock(ServicePlugin.class);
		Mockito.when(service1.getKey()).thenReturn("service:sample:tool");
		resource.determinePluginType(service1);
	}
}
