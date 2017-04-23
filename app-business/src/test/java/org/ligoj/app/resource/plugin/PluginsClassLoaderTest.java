package org.ligoj.app.resource.plugin;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.ligoj.app.api.PluginException;

/**
 * Test class of {@link PluginsClassLoader}
 */
public class PluginsClassLoaderTest {

	protected static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	@Before
	public void cleanHome() throws IOException {
		FileUtils.deleteDirectory(new File(new File(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER), PluginsClassLoader.EXPORT_DIR));
	}

	@Test
	public void standardHome() throws Exception {
		PluginsClassLoader classLoader = null;
		final String oldHome = System.getProperty("user.home");
		try {
			System.setProperty("user.home", USER_HOME_DIRECTORY);
			classLoader = checkClassLoader();
		} finally {
			System.setProperty("user.home", oldHome);
			IOUtils.closeQuietly(classLoader);
		}
	}

	@Test
	public void forcedHome() throws Exception {
		PluginsClassLoader classLoader = null;
		try {
			System.setProperty("ligoj.home", USER_HOME_DIRECTORY + "/.ligoj");
			classLoader = checkClassLoader();
		} finally {
			System.clearProperty("ligoj.home");
			IOUtils.closeQuietly(classLoader);
		}
	}

	@Test
	public void forcedHomeTwice() throws Exception {
		PluginsClassLoader classLoader = null;
		try {
			System.setProperty("ligoj.home", USER_HOME_DIRECTORY + "/.ligoj");
			classLoader = checkClassLoader();
			classLoader = checkClassLoader();
			Assert.assertNotNull(classLoader.getHomeDirectory());
			Assert.assertNotNull(classLoader.getPluginDirectory());
		} finally {
			System.clearProperty("ligoj.home");
			IOUtils.closeQuietly(classLoader);
		}
	}

	@Test(expected = PluginException.class)
	public void copyFailed() throws IOException {
		PluginsClassLoader classLoader = null;
		try {
			System.setProperty("ligoj.home", USER_HOME_DIRECTORY + "/.ligoj");
			classLoader = new PluginsClassLoader() {
				@Override
				protected void copy(final Path from, final Path dest) throws IOException {
					throw new IOException();
				}
			};
			classLoader.copyExportedResources("any", null, null);
		} finally {
			System.clearProperty("ligoj.home");
			IOUtils.closeQuietly(classLoader);
		}
	}

	private PluginsClassLoader checkClassLoader() throws IOException {
		PluginsClassLoader classLoader;
		classLoader = new PluginsClassLoader();
		Assert.assertEquals(3, classLoader.getURLs().length);

		// Check the home is in the class-path
		final URL homeUrl = classLoader.getURLs()[0];
		Assert.assertTrue(homeUrl.getFile().endsWith("/"));

		// Check the plug-in is in the class-path
		final URL pluginTestUrl = classLoader.getURLs()[1];
		Assert.assertTrue(pluginTestUrl.getFile().endsWith("plugin-foo-1.0.1.jar"));

		// Check the JAR is readable
		final InputStream pluginTestUrlStream = pluginTestUrl.openStream();
		Assert.assertNotNull(pluginTestUrlStream);
		IOUtils.closeQuietly(pluginTestUrlStream);

		// Check the content of the plug-in is resolvable from the class loader
		IOUtils.toString(classLoader.getResourceAsStream("home-test/.ligoj/plugins/plugin-foo-1.0.1.jar"), StandardCharsets.UTF_8.name());
		Assert.assertEquals("FOO", IOUtils.toString(classLoader.getResourceAsStream("plugin-foo.txt"), StandardCharsets.UTF_8.name()));

		final File export = new File(USER_HOME_DIRECTORY + "/.ligoj/export");
		Assert.assertTrue(export.exists());
		Assert.assertTrue(export.isDirectory());
		Assert.assertTrue(new File(export, "export.txt").exists());
		Assert.assertTrue(new File(export, "export.txt").isFile());
		Assert.assertEquals("EXPORT", FileUtils.readFileToString(new File(export, "export.txt"), StandardCharsets.UTF_8.name()));
		return classLoader;
	}

}
