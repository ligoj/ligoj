/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import javax.transaction.Transactional;

import org.apache.commons.io.FileUtils;
import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.bootstrap.core.plugin.FeaturePlugin;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.ligoj.bootstrap.dao.system.SystemPluginRepository;
import org.ligoj.bootstrap.model.system.SystemBench;
import org.ligoj.bootstrap.model.system.SystemConfiguration;
import org.ligoj.bootstrap.model.system.SystemPlugin;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test class of {@link LigojPluginListener}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class LigojPluginListenerTest extends AbstractServerTest {

	protected static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	/**
	 * File used to be created when a plug-in is downloaded from this test class
	 */
	private static final File TEMP_FILE = Paths.get(USER_HOME_DIRECTORY, org.ligoj.bootstrap.core.plugin.PluginsClassLoader.HOME_DIR_FOLDER,
			org.ligoj.bootstrap.core.plugin.PluginsClassLoader.PLUGINS_DIR, "plugin-iam-node-test.jar").toFile();

	@Autowired
	private LigojPluginListener resource;

	@Autowired
	private SystemPluginRepository repository;

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	protected ConfigurationResource configuration;

	@BeforeEach
	public void prepareData() throws IOException {
		persistEntities("csv", new Class[] { SystemConfiguration.class, Node.class, Project.class, Subscription.class },
				StandardCharsets.UTF_8.name());
		FileUtils.deleteQuietly(TEMP_FILE);
	}

	@AfterEach
	public void cleanArtifacts() {
		FileUtils.deleteQuietly(TEMP_FILE);
	}

	@Test
	public void toVo() {
		Assertions.assertTrue(resource.toVo().get() instanceof LigojPluginVo);
	}

	@Test
	public void fillVoIsFeature() {
		final SystemPlugin p = new SystemPlugin();
		p.setType("FEATURE");
		final LigojPluginVo vo = new LigojPluginVo();
		resource.fillVo(p, null, vo);
		Assertions.assertEquals(0, vo.getNodes());
		Assertions.assertEquals(0, vo.getSubscriptions());
		Assertions.assertNull(vo.getNode());
	}

	@Test
	public void fillVoIsNotFeature() {
		final SystemPlugin entity = new SystemPlugin();
		entity.setType("SERVICE");
		entity.setKey("service:sample:tool");
		final LigojPluginVo vo = new LigojPluginVo();
		resource.fillVo(entity, null, vo);
		Assertions.assertEquals(2, vo.getNodes());
		Assertions.assertEquals(3, vo.getSubscriptions());
		Assertions.assertEquals("service:sample:tool", vo.getNode().getId());
	}

	@Test
	public void installExists() {
		Assertions.assertFalse(resource.install(new SampleService()));
	}

	@Test
	public void installNotExists() {
		Assertions.assertTrue(resource.install(new SampleTool1()));
	}

	@Test
	public void configure() {
		final SampleService service1 = new SampleService();
		final SystemPlugin entity = new SystemPlugin();

		// Configure, but is already installed
		resource.configure(service1, entity);
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());

		// Configure, but is already installed
		final SampleTool1 service2 = new SampleTool1();
		resource.configure(service2, entity);
		Assertions.assertEquals("TOOL", entity.getType());

		// Uninstall the plug-in entity only from the plug-in registry
		repository.deleteAllBy("key", "service:sample:tool1");

		// Reinstall
		resource.configure(service2, entity);
		Assertions.assertEquals("TOOL", entity.getType());
	}

	@Test
	public void configureFeature() {
		final FeaturePlugin service1 = Mockito.mock(FeaturePlugin.class);
		final SystemPlugin entity = new SystemPlugin();
		resource.configure(service1, entity);
		Assertions.assertEquals("FEATURE", entity.getType());
	}

	@Test
	public void configureWithImplicitNode() {
		final ServicePlugin service1 = new SampleService() {
			@Override
			public List<Class<?>> getInstalledEntities() {
				return Arrays.asList(SystemBench.class); // "Node" class is not included
			}
		};
		em.createQuery("DELETE Subscription").executeUpdate();
		em.createQuery("DELETE Node").executeUpdate();
		final SystemPlugin entity = new SystemPlugin();

		resource.configure(service1, entity);
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());
	}

	@Test
	public void configureWithExplicitNode() {
		final ServicePlugin service1 = new SampleService() {
			@Override
			public List<Class<?>> getInstalledEntities() {
				return Arrays.asList(Node.class); // "Node" class is included
			}
		};
		final SystemPlugin entity = new SystemPlugin();
		resource.configure(service1, entity); // No implicit Node install for this plug-in
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());
	}

	@Test
	public void determinePluginType() {
		Assertions.assertEquals(PluginType.SERVICE, resource.determinePluginType(new SampleService()));
		Assertions.assertEquals(PluginType.TOOL, resource.determinePluginType(new SampleTool1()));
	}

	@Test
	public void determinePluginTypeError() {
		final ServicePlugin service1 = Mockito.mock(ServicePlugin.class);
		Mockito.when(service1.getKey()).thenReturn("service:sample:tool");
		Assertions.assertThrows(TechnicalException.class, () -> {
			resource.determinePluginType(service1);
		});
	}

	@Test
	public void getPluginClassLoader() {
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		try (ThreadClassLoaderScope scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0], pluginsClassLoader))) {
			Assertions.assertNotNull(resource.getPluginClassLoader());
		}
	}

	private LigojPluginListener newPluginResourceInstall() {
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		final Path directory = Mockito.mock(Path.class);
		Mockito.when(pluginsClassLoader.getHomeDirectory()).thenReturn(Paths.get(USER_HOME_DIRECTORY));
		Mockito.when(directory.resolve(ArgumentMatchers.anyString()))
				.thenReturn(Paths.get(USER_HOME_DIRECTORY, org.ligoj.bootstrap.core.plugin.PluginsClassLoader.HOME_DIR_FOLDER,
						org.ligoj.bootstrap.core.plugin.PluginsClassLoader.PLUGINS_DIR).resolve("plugin-iam-node-test.jar"));
		Mockito.when(pluginsClassLoader.getPluginDirectory()).thenReturn(directory);
		final LigojPluginListener pluginResource = new LigojPluginListener() {
			@Override
			protected PluginsClassLoader getPluginClassLoader() {
				return pluginsClassLoader;
			}

		};
		applicationContext.getAutowireCapableBeanFactory().autowireBean(pluginResource);
		return pluginResource;
	}

	@Test
	public void toFile() throws IOException {
		final Subscription subscription = new Subscription();
		final Node service = new Node();
		service.setId("service:s1");
		final Node tool = new Node();
		tool.setId("service:s1:t1");
		tool.setRefined(service);
		subscription.setNode(tool);
		subscription.setId(99);
		final String[] fragments = new String[] { "sub-dir" };
		final File file = newPluginResourceInstall().toFile(subscription, fragments);
		Assertions.assertNotNull(USER_HOME_DIRECTORY + "/service-s1/t1/99/sub-dir", file.toString());
	}

	@Test
	public void getParentNode() {
		Assertions.assertEquals("service:sample", newPluginResourceInstall().getParentNode("service:sample:tool1").getId());
	}

	@Test
	public void getParentNodeRoot() {
		Assertions.assertNull(newPluginResourceInstall().getParentNode("service:sample"));
	}

}
