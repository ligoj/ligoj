/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

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
import org.ligoj.app.model.Parameter;
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
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Test class of {@link LigojPluginListener}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
class LigojPluginListenerTest extends AbstractServerTest {

	protected static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	/**
	 * File used to be created when a plug-in is downloaded from this test class
	 */
	private static final File TEMP_FILE = Paths
			.get(USER_HOME_DIRECTORY, org.ligoj.bootstrap.core.plugin.PluginsClassLoader.HOME_DIR_FOLDER,
					org.ligoj.bootstrap.core.plugin.PluginsClassLoader.PLUGINS_DIR, "plugin-iam-node-test.jar")
			.toFile();

	@Autowired
	private LigojPluginListener resource;

	@Autowired
	private SystemPluginRepository repository;

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	protected ConfigurationResource configuration;

	@BeforeEach
	void prepareData() throws IOException {
		persistEntities("csv", new Class<?>[] { SystemConfiguration.class, Node.class, Project.class, Subscription.class,
				Parameter.class }, StandardCharsets.UTF_8);
		FileUtils.deleteQuietly(TEMP_FILE);
	}

	@AfterEach
	void cleanArtifacts() {
		FileUtils.deleteQuietly(TEMP_FILE);
	}

	@Test
	void toVo() {
		Assertions.assertTrue(resource.toVo().get() instanceof LigojPluginVo);
	}

	@Test
	void fillVoIsFeature() {
		final var p = new SystemPlugin();
		p.setType("FEATURE");
		final var vo = new LigojPluginVo();
		resource.fillVo(p, null, vo);
		Assertions.assertEquals(0, vo.getNodes());
		Assertions.assertEquals(0, vo.getSubscriptions());
		Assertions.assertNull(vo.getNode());
	}

	@Test
	void fillVoIsNotFeature() {
		final var entity = new SystemPlugin();
		entity.setType("SERVICE");
		entity.setKey("service:sample:tool");
		final var vo = new LigojPluginVo();
		resource.fillVo(entity, null, vo);
		Assertions.assertEquals(2, vo.getNodes());
		Assertions.assertEquals(3, vo.getSubscriptions());
		Assertions.assertEquals("service:sample:tool", vo.getNode().getId());
	}

	@Test
	void installExists() {
		Assertions.assertFalse(resource.install(new SampleService()));
	}

	@Test
	void installNotExists() {
		Assertions.assertTrue(resource.install(new SampleTool1()));
	}

	@Test
	void configure() {
		final var service1 = new SampleService();
		final var entity = new SystemPlugin();

		// Configure, but is already installed
		resource.configure(service1, entity);
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());

		// Configure, but is already installed
		final var service2 = new SampleTool1();
		resource.configure(service2, entity);
		Assertions.assertEquals("TOOL", entity.getType());

		// Uninstall the plug-in entity only from the plug-in registry
		repository.deleteAllBy("key", "service:sample:tool1");

		// Reinstall
		resource.configure(service2, entity);
		Assertions.assertEquals("TOOL", entity.getType());
	}

	@Test
	void configureFeature() {
		final var service1 = Mockito.mock(FeaturePlugin.class);
		final var entity = new SystemPlugin();
		resource.configure(service1, entity);
		Assertions.assertEquals("FEATURE", entity.getType());
	}

	@Test
	void configureWithImplicitNode() {
		final var service1 = new SampleService() {
			@Override
			public List<Class<?>> getInstalledEntities() {
				return List.of(SystemBench.class); // "Node" class is not included
			}
		};
		em.createQuery("DELETE Subscription").executeUpdate();
		em.createQuery("DELETE Node").executeUpdate();
		final var entity = new SystemPlugin();

		resource.configure(service1, entity);
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());
	}

	@Test
	void configureWithExplicitNode() {
		final var service1 = new SampleService() {
			@Override
			public List<Class<?>> getInstalledEntities() {
				return List.of(Node.class); // "Node" class is included
			}
		};
		final var entity = new SystemPlugin();
		resource.configure(service1, entity); // No implicit Node install for this plug-in
		Assertions.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assertions.assertEquals("SERVICE", entity.getType());
	}

	@Test
	void determinePluginType() {
		Assertions.assertEquals(PluginType.SERVICE, resource.determinePluginType(new SampleService()));
		Assertions.assertEquals(PluginType.TOOL, resource.determinePluginType(new SampleTool1()));
	}

	@Test
	void determinePluginTypeError() {
		final var service1 = Mockito.mock(ServicePlugin.class);
		Mockito.when(service1.getKey()).thenReturn("service:sample:tool");
		Assertions.assertThrows(TechnicalException.class, () -> resource.determinePluginType(service1));
	}

	@Test
	void getPluginClassLoader() {
		final var pluginsClassLoader = Mockito.mock(LigojPluginsClassLoader.class);
		try (var ignored = new ThreadClassLoaderScope(
				new URLClassLoader(new URL[0], pluginsClassLoader))) {
			Assertions.assertNotNull(resource.getPluginClassLoader());
		}
	}

	private LigojPluginListener newPluginResourceInstall() {
		final var pluginsClassLoader = Mockito.mock(LigojPluginsClassLoader.class);
		final var directory = Mockito.mock(Path.class);
		Mockito.when(pluginsClassLoader.getHomeDirectory()).thenReturn(Paths.get(USER_HOME_DIRECTORY));
		Mockito.when(directory.resolve(ArgumentMatchers.anyString()))
				.thenReturn(Paths
						.get(USER_HOME_DIRECTORY, org.ligoj.bootstrap.core.plugin.PluginsClassLoader.HOME_DIR_FOLDER,
								org.ligoj.bootstrap.core.plugin.PluginsClassLoader.PLUGINS_DIR)
						.resolve("plugin-iam-node-test.jar"));
		Mockito.when(pluginsClassLoader.getPluginDirectory()).thenReturn(directory);
		final var pluginResource = new LigojPluginListener() {
			@Override
			protected LigojPluginsClassLoader getPluginClassLoader() {
				return pluginsClassLoader;
			}

		};
		applicationContext.getAutowireCapableBeanFactory().autowireBean(pluginResource);
		return pluginResource;
	}

	@Test
	void toFile() throws IOException {
		final var subscription = new Subscription();
		final var service = new Node();
		service.setId("service:s1");
		final var tool = new Node();
		tool.setId("service:s1:t1");
		tool.setRefined(service);
		subscription.setNode(tool);
		subscription.setId(99);
		final var fragments = new String[] { "sub-dir" };
		final var file = newPluginResourceInstall().toFile(subscription, fragments);
		Assertions.assertEquals(USER_HOME_DIRECTORY + "/service-s1/t1/99/sub-dir", file.toString());
	}

	@Test
	void getParentNode() {
		Assertions.assertEquals("service:sample",
				newPluginResourceInstall().getParentNode("service:sample:tool1").getId());
	}

	@Test
	void getParentNodeRoot() {
		Assertions.assertNull(newPluginResourceInstall().getParentNode("service:sample"));
	}

}
