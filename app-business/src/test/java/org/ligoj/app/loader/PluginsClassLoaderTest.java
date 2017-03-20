package org.ligoj.app.loader;

import org.junit.Assert;
import org.junit.Test;

import org.ligoj.bootstrap.core.resource.TechnicalException;

public class PluginsClassLoaderTest {

	private static final String PLUGINS_DIRECTORY = "./target/test-classes/org/ligoj/saas/loader";

	@Test
	public void jarsAreLoadedByClassLoader() throws Exception {
		System.setProperty(PluginsClassLoader.PLUGINS_DIR, PLUGINS_DIRECTORY);
		final PluginsClassLoader classLoader = new PluginsClassLoader();
		Assert.assertEquals(1, classLoader.getURLs().length);
		Assert.assertTrue(classLoader.getURLs()[0].getFile().endsWith("junit.jar"));
		classLoader.close();
	}

	@Test(expected = TechnicalException.class)
	public void PluginsDirSystemPropertyMustBeDefined() throws Exception {
		final PluginsClassLoader classLoader = new PluginsClassLoader();
		classLoader.close();
	}

}
