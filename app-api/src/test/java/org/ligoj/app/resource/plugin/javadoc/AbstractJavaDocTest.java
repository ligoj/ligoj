/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import org.ligoj.bootstrap.core.plugin.PluginsClassLoader;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Paths;
import java.util.List;

/**
 * Base  class for Javadoc related test classes
 */
public abstract class AbstractJavaDocTest {

	private static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";
	private static final String USER_HOME_DIRECTORY2 = "src/test/resources/home-test";

	protected List<URL> newJavadocUrls() throws IOException {
		final var jarPath = Paths.get(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR).resolve("plugin-javadoc.jar");
		final var jarPath2 = Paths.get(USER_HOME_DIRECTORY2, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR).resolve("plugin-javadoc.jar");
		return List.of(jarPath.toUri().toURL(),jarPath2.toUri().toURL());
	}
}
