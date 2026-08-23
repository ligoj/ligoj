/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import org.junit.jupiter.api.Test;
import org.ligoj.app.resource.plugin.LigojPluginsClassLoader;
import org.ligoj.bootstrap.core.plugin.PluginsClassLoader;
import org.mockito.ArgumentMatchers;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link LigojOpenApiFeature}
 */
class LigojOpenApiFeatureTest {

	private static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	@Test
	void constructor() throws IOException {
		new LigojOpenApiFeature("1.0.0") {
			@Override
			protected LigojPluginsClassLoader getPluginClassLoader() {
				return null;
			}

		};

		final var classloader = mock(LigojPluginsClassLoader.class);
		final var path = Paths.get(USER_HOME_DIRECTORY, PluginsClassLoader.HOME_DIR_FOLDER, PluginsClassLoader.PLUGINS_DIR).resolve("plugin-javadoc.jar");
		final var pluginFiles = Map.of("plugin-javadoc", path.toString());
		doAnswer(invocationOnMock -> {
			@SuppressWarnings("unchecked") final var versionFileToPath = (Map<String, Path>) invocationOnMock.getArgument(0);
			versionFileToPath.put(path.toString(), path);
			return pluginFiles;
		}).when(classloader).getInstalledPlugins(ArgumentMatchers.any(), ArgumentMatchers.anyBoolean());
		new LigojOpenApiFeature("1.0.0") {
			@Override
			protected PluginsClassLoader getPluginClassLoader() {
				return classloader;
			}
		}.addJavadoc();
		verify(classloader, atLeastOnce()).getInstalledPlugins(ArgumentMatchers.any(), ArgumentMatchers.eq(true));
	}

}
