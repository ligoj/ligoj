package org.ligoj.app.resource.plugin;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import javax.persistence.EntityManager;
import javax.transaction.Transactional;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.app.api.FeaturePlugin;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.PluginRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Plugin;
import org.ligoj.app.model.PluginType;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.bootstrap.core.dao.csv.CsvForJpa;
import org.ligoj.bootstrap.core.resource.BusinessException;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.ligoj.bootstrap.model.system.SystemBench;
import org.ligoj.bootstrap.model.system.SystemConfiguration;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.DefaultSingletonBeanRegistry;
import org.springframework.cloud.context.restart.RestartEndpoint;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringRunner;

/**
 * Test class of {@link PluginResource}
 */
@RunWith(SpringRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class PluginResourceTest extends AbstractServerTest {

	protected static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	/**
	 * File used to be created when a plugin is downloaded from this test class
	 */
	private static final File TEMP_FILE = Paths
			.get(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR, "plugin-iam-node-test.jar").toFile();

	@Autowired
	private PluginResource resource;

	@Autowired
	private PluginRepository repository;

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private RestartEndpoint restartEndpoint;

	@Before
	public void prepareData() throws IOException {
		persistEntities("csv", new Class[] { SystemConfiguration.class, Node.class, Project.class, Subscription.class },
				StandardCharsets.UTF_8.name());
	}

	@Test
	public void findAll() {
		final SampleService service1 = new SampleService();
		final SampleTool tool1 = new SampleTool();

		try {

			// Add some plug-ins
			final Plugin pluginId = new Plugin();
			pluginId.setKey("service:sample");
			pluginId.setType(PluginType.SERVICE);
			pluginId.setVersion("1.0");
			repository.saveAndFlush(pluginId);
			((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleService", service1);

			final Plugin pluginIdLdap = new Plugin();
			pluginIdLdap.setKey("service:sample:tool");
			pluginIdLdap.setType(PluginType.TOOL);
			pluginIdLdap.setVersion("1.1");
			repository.saveAndFlush(pluginIdLdap);
			((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleTool", tool1);

			final List<PluginVo> plugins = resource.findAll();
			Assert.assertEquals(4, plugins.size());

			// Plug-in from the API
			final PluginVo plugin0 = plugins.get(0);
			Assert.assertEquals("feature:iam:empty", plugin0.getId());
			Assert.assertEquals("IAM Empty", plugin0.getName());
			Assert.assertEquals("Gfi Informatique", plugin0.getVendor());
			Assert.assertTrue(plugin0.getLocation().endsWith(".jar"));
			Assert.assertNotNull(plugin0.getPlugin().getVersion());
			Assert.assertNull(plugin0.getNode());
			Assert.assertEquals(0, plugin0.getNodes());
			Assert.assertEquals(0, plugin0.getSubscriptions());
			Assert.assertEquals(PluginType.FEATURE, plugin0.getPlugin().getType());

			// Plug-in (feature) embedded in the current project
			final PluginVo plugin1 = plugins.get(1);
			Assert.assertEquals("feature:welcome:data-rbac", plugin1.getId());
			Assert.assertEquals("Welcome Data RBAC", plugin1.getName());
			Assert.assertNull(plugin1.getVendor());
			Assert.assertFalse(plugin1.getLocation().endsWith(".jar"));
			Assert.assertNotNull(plugin1.getPlugin().getVersion());
			Assert.assertNull(plugin1.getNode());
			Assert.assertEquals(0, plugin1.getNodes());
			Assert.assertEquals(0, plugin1.getSubscriptions());
			Assert.assertEquals(PluginType.FEATURE, plugin1.getPlugin().getType());

			// External plug-in service
			final PluginVo plugin2 = plugins.get(2);
			Assert.assertEquals("service:sample", plugin2.getId());
			Assert.assertEquals("Sample", plugin2.getName());
			Assert.assertNull(plugin2.getVendor());
			Assert.assertFalse(plugin2.getLocation().endsWith(".jar"));
			Assert.assertEquals("1.0", plugin2.getPlugin().getVersion());
			Assert.assertEquals("service:sample", plugin2.getNode().getId());
			Assert.assertEquals(3, plugin2.getNodes());
			Assert.assertEquals(3, plugin2.getSubscriptions());
			Assert.assertEquals(PluginType.SERVICE, plugin2.getPlugin().getType());

			// External plug-in tool
			final PluginVo plugin3 = plugins.get(3);
			Assert.assertEquals("service:sample:tool", plugin3.getId());
			Assert.assertEquals("Tool", plugin3.getName());
			Assert.assertNull(plugin3.getVendor());
			Assert.assertFalse(plugin3.getLocation().endsWith(".jar"));
			Assert.assertEquals("1.1", plugin3.getPlugin().getVersion());
			Assert.assertEquals("service:sample:tool", plugin3.getNode().getId());
			Assert.assertEquals(2, plugin3.getNodes());
			Assert.assertEquals(3, plugin3.getSubscriptions());
			Assert.assertEquals(PluginType.TOOL, plugin3.getPlugin().getType());
		} finally {
			destroySingleton("sampleService");
			destroySingleton("sampleTool");
		}
	}

	@Test
	public void configurePluginInstall() {
		// The class-loader of this mock corresponds to the one related to SampleService
		// So corresponds to API jar and not this project
		final SampleService service1 = new SampleService();
		resource.configurePluginInstall(service1);
		Assert.assertEquals("Sample", nodeRepository.findOneExpected("service:sample").getName());
		Assert.assertEquals(PluginType.SERVICE, repository.findByExpected("key", "service:sample").getType());
		Assert.assertNotNull(repository.findByExpected("key", "service:sample").getVersion());

		final SampleTool service2 = new SampleTool();
		resource.configurePluginInstall(service2);
	}

	@Test(expected = TechnicalException.class)
	public void configurePluginInstallManagedEntitiesNotSameClassloader() {
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

	@Test
	public void configurePluginInstallManagedEntities() {
		// Need this subclass to be in the same class-loader than the related CSV
		final ServicePlugin service1 = new SampleService() {
			@Override
			public List<Class<?>> getInstalledEntities() {
				return Arrays.asList(Node.class, SystemBench.class);
			}
		};
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

	@Test
	public void getVersion() {
		// Version is resolved from the date
		Assert.assertTrue(resource.getVersion(new SampleService()).startsWith("20"));
	}

	@Test
	public void getVersionIOException() {
		Assert.assertEquals("?", new PluginResource() {
			@Override
			protected String getLastModifiedTime(final FeaturePlugin plugin) throws IOException, URISyntaxException {
				throw new IOException();
			}
		}.getVersion(Mockito.mock(ServicePlugin.class)));
	}

	@Test
	public void getVersionURISyntaxException() {
		Assert.assertEquals("?", new PluginResource() {
			@Override
			protected String getLastModifiedTime(final FeaturePlugin plugin) throws IOException, URISyntaxException {
				throw new URISyntaxException("input", "reason");
			}
		}.getVersion(Mockito.mock(ServicePlugin.class)));
	}

	@Test
	public void refreshPlugins() throws Exception {
		final ContextRefreshedEvent event = Mockito.mock(ContextRefreshedEvent.class);
		Mockito.when(event.getApplicationContext()).thenReturn(applicationContext);
		resource.refreshPlugins(event);
	}

	/**
	 * Disable plug-in refresh
	 */
	@Test
	public void refreshFailSafe() throws Exception {
		ThreadClassLoaderScope scope = null;
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		Mockito.when(pluginsClassLoader.isSafeMode()).thenReturn(true);
		try {
			scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0], pluginsClassLoader));
			new PluginResource().refreshPlugins(null);
		} finally {
			IOUtils.closeQuietly(scope);
		}
	}

	@Test
	public void refreshPluginsUpdate() throws Exception {
		final SampleService service1 = new SampleService() {
			@Override
			public String getVersion() {
				return "1.1";
			}
		};
		final SampleService service2 = new SampleService() {
			@Override
			public String getVersion() {
				return "2.0";
			}
		};

		try {
			// Precondition
			Assert.assertNull(repository.findBy("key", "service:sample"));

			// Add a plug-in is an initial version
			((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleService", service1);

			final ContextRefreshedEvent event = Mockito.mock(ContextRefreshedEvent.class);
			Mockito.when(event.getApplicationContext()).thenReturn(applicationContext);
			resource.refreshPlugins(event);
			Assert.assertEquals("1.1", repository.findByExpected("key", "service:sample").getVersion());

			// Add a plug-in is a different version
			destroySingleton("sampleService");
			((ConfigurableApplicationContext) applicationContext).getBeanFactory().registerSingleton("sampleService", service2);
			resource.refreshPlugins(event);
			Assert.assertEquals("2.0", repository.findByExpected("key", "service:sample").getVersion());
		} finally {
			destroySingleton("sampleService");
		}

	}

	/**
	 * Destroy the given bean instance (usually a prototype instance
	 * obtained from this factory) according to its bean definition.
	 * <p>
	 * Any exception that arises during destruction should be caught
	 * and logged instead of propagated to the caller of this method.
	 * 
	 * @param beanName
	 *            the name of the bean definition
	 * @param beanInstance
	 *            the bean instance to destroy
	 */
	private void destroySingleton(final String beanName) {
		try {
			((DefaultSingletonBeanRegistry) ((ConfigurableApplicationContext) applicationContext).getBeanFactory()).destroySingleton(beanName);
		} catch (NoSuchBeanDefinitionException e) {
			// Ignore
		}
	}

	@Test(expected = TechnicalException.class)
	public void configurePluginEntityNotFound() throws MalformedURLException, IOException {
		new PluginResource().configurePluginEntity(Arrays.stream(new URL[] { new URL("file://tmp") }), SystemUser.class, "---");
	}

	@Test
	public void configurePluginEntityFromJar() throws MalformedURLException, IOException {
		final URL url = Thread.currentThread().getContextClassLoader().getResource("csv/cache-user.csv");
		final PluginResource pluginResource = new PluginResource();
		pluginResource.em = Mockito.mock(EntityManager.class);
		pluginResource.csvForJpa = Mockito.mock(CsvForJpa.class);
		pluginResource.configurePluginEntity(Arrays.stream(new URL[] { url }), SystemUser.class, url.getPath());
	}

	@Test
	public void configurePluginEntityFromProject() throws MalformedURLException, IOException {
		final URL url = Thread.currentThread().getContextClassLoader().getResource("csv/system-user.csv");
		final PluginResource pluginResource = new PluginResource();
		pluginResource.em = Mockito.mock(EntityManager.class);
		pluginResource.csvForJpa = Mockito.mock(CsvForJpa.class);
		pluginResource.configurePluginEntity(Arrays.stream(new URL[] { url }), SystemUser.class, url.toString());
	}

	@Test(expected = BusinessException.class)
	public void installNotExists() {
		newPluginResourceInstall().install("any");
	}

	@Test(expected = BusinessException.class)
	public void installNotExistsVersion() {
		newPluginResourceInstall().install("any", "dummy");
	}

	@Test
	public void install() {
		newPluginResourceInstall().install("plugin-iam-node");
		Assert.assertTrue(TEMP_FILE.exists());
	}

	@Test
	public void getPluginClassLoaderOutOfClassLoader() {
		Assert.assertNull(resource.getPluginClassLoader());
	}

	@Test
	public void restart() throws InterruptedException {
		// Difficult to test...
		resource.restart();
		Thread.sleep(100);
		Mockito.verify(restartEndpoint).restart();
	}

	@Test
	public void getPluginClassLoader() {
		ThreadClassLoaderScope scope = null;
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		try {
			scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0], pluginsClassLoader));
			Assert.assertNotNull(resource.getPluginClassLoader());
		} finally {
			IOUtils.closeQuietly(scope);
		}
	}

	private PluginResource newPluginResourceInstall() {
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		final Path directory = Mockito.mock(Path.class);
		Mockito.when(directory.resolve(ArgumentMatchers.anyString())).thenReturn(Paths
				.get(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR).resolve("plugin-iam-node-test.jar"));
		Mockito.when(pluginsClassLoader.getPluginDirectory()).thenReturn(directory);
		final PluginResource pluginResource = new PluginResource() {
			@Override
			protected PluginsClassLoader getPluginClassLoader() {
				return pluginsClassLoader;
			}

		};
		applicationContext.getAutowireCapableBeanFactory().autowireBean(pluginResource);
		return pluginResource;
	}

	private PluginResource newPluginResourceRemove(final String artifact) throws IOException {
		ThreadClassLoaderScope scope = null;
		final PluginsClassLoader pluginsClassLoader = Mockito.mock(PluginsClassLoader.class);
		try {
			scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0], pluginsClassLoader));
			Assert.assertNotNull(PluginsClassLoader.getInstance());
			Mockito.when(pluginsClassLoader.getPluginDirectory())
					.thenReturn(Paths.get(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR));
			final PluginResource pluginResource = new PluginResource() {
				@Override
				protected PluginsClassLoader getPluginClassLoader() {
					return pluginsClassLoader;
				}

			};
			applicationContext.getAutowireCapableBeanFactory().autowireBean(pluginResource);
			pluginResource.remove(artifact);
			return pluginResource;
		} finally {
			IOUtils.closeQuietly(scope);
		}
	}

	@After
	public void cleanArtifacts() {
		FileUtils.deleteQuietly(TEMP_FILE);
	}

	/**
	 * Remove a non existing plugin : no error
	 */
	@Test
	public void removeNotExists() throws IOException {
		newPluginResourceRemove("any");
	}

	/**
	 * Remove a plug-in having explicit depending (by name) plug-ins : all related plug-ins are deleted. Note this
	 * feature works only for plug-ins that are not loaded in the classloader. Need an {@link URLClassLoader#close()}
	 */
	@Test
	public void removeWidest() throws IOException {
		Assert.assertFalse(TEMP_FILE.exists());
		FileUtils.touch(TEMP_FILE);
		Assert.assertTrue(TEMP_FILE.exists());
		newPluginResourceRemove("plugin-iam");
		Assert.assertFalse(TEMP_FILE.exists());
	}

	/**
	 * Remove the exact plug-in, and only it.
	 */
	@Test
	public void removeExact() throws IOException {
		Assert.assertFalse(TEMP_FILE.exists());
		FileUtils.touch(TEMP_FILE);
		Assert.assertTrue(TEMP_FILE.exists());
		newPluginResourceRemove("plugin-iam");
		Assert.assertFalse(TEMP_FILE.exists());
	}

	@Test
	public void searchPluginsInMavenRepoNoResult() throws IOException {
		final List<MavenSearchResultItem> result = searchPluginsInMavenRepo("no-result");
		Assert.assertTrue("Search result should be empty.", result.isEmpty());
	}

	@Test
	public void searchPluginsOnMavenRepoOneResult() throws IOException {
		final List<MavenSearchResultItem> result = searchPluginsInMavenRepo("buil");
		Assert.assertEquals(1, result.size());
		Assert.assertEquals("plugin-build", result.get(0).getArtifact());
		Assert.assertEquals("0.0.1", result.get(0).getVersion());
	}

	private List<MavenSearchResultItem> searchPluginsInMavenRepo(final String query) throws IOException {
		httpServer.stubFor(get(urlEqualTo("/solrsearch/select?wt=json&rows=100&q=org.ligoj.plugin"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody(
						IOUtils.toString(new ClassPathResource("mock-server/maven-repo/search.json").getInputStream(), StandardCharsets.UTF_8))));
		httpServer.start();
		return resource.search(query);
	}
}
