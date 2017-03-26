package org.ligoj.app.loader;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import org.apache.commons.io.IOUtils;
import org.junit.Assert;
import org.junit.Test;

/**
 * Test class of {@link PluginsClassLoader}
 */
public class PluginsClassLoaderTest {

	private static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

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

	private PluginsClassLoader checkClassLoader() throws IOException {
		PluginsClassLoader classLoader;
		classLoader = new PluginsClassLoader();
		Assert.assertEquals(1, classLoader.getURLs().length);
		
		// Check the plug-in is in the class-path
		final URL pluginTestUrl = classLoader.getURLs()[0];
		Assert.assertTrue(pluginTestUrl.getFile().endsWith("plugin-foo.jar"));
		
		// Check the JAR is readable
		final InputStream pluginTestUrlStream = pluginTestUrl.openStream();
		Assert.assertNotNull(pluginTestUrlStream);
		IOUtils.closeQuietly(pluginTestUrlStream);
		
		// Check the content of the plug-in is resolvable from the class loader
		IOUtils.toString(classLoader.getResourceAsStream("home-test/.ligoj/plugins/plugin-foo.jar"), StandardCharsets.UTF_8.name());
		Assert.assertEquals("BAR", IOUtils.toString(classLoader.getResourceAsStream("plugin-foo.txt"), StandardCharsets.UTF_8.name()));
		return classLoader;
	}

}
