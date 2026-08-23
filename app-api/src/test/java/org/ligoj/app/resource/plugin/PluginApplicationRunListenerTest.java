/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.ligoj.bootstrap.core.plugin.PluginsClassLoader;
import org.springframework.boot.SpringApplication;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.security.NoSuchAlgorithmException;

import static org.mockito.Mockito.mock;

/**
 * Test class of {@link -PluginApplicationRunListener}
 */
class PluginApplicationRunListenerTest {

	@Test
	void noPluginClassLoader() {
		try (var classLoader = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]))) {
			Assertions.assertTrue(classLoader.getScopedClassLoader() instanceof URLClassLoader);
			new PluginApplicationRunListener(mock(SpringApplication.class)).starting(null);
		}
		Assertions.assertEquals("app", Thread.currentThread().getContextClassLoader().getName());
	}

	@Test
	void pluginClassLoader() throws IOException, NoSuchAlgorithmException {
		try (var classLoader = new ThreadClassLoaderScope(new PluginsClassLoader())) {
			Assertions.assertTrue(classLoader.getScopedClassLoader() instanceof URLClassLoader);
			final var listener = new PluginApplicationRunListener(mock(SpringApplication.class));
			listener.starting(null);
			Assertions.assertTrue(listener.getOrder() < 0);
			listener.environmentPrepared(null, null);
			listener.contextPrepared(null);
			listener.contextLoaded(null);
			listener.started(null, null);
			listener.ready(null, null);
			listener.failed(null, null);
		}
		Assertions.assertEquals("app", Thread.currentThread().getContextClassLoader().getName());
	}

	@Test
	void pluginClassLoaderFail() {
		final var oldValue = System.getProperty(PluginsClassLoader.HOME_DIR_PROPERTY);
		try (var classLoader = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]))) {
			Assertions.assertTrue(classLoader.getScopedClassLoader() instanceof URLClassLoader);
			// Inject an invalid path
			System.setProperty(PluginsClassLoader.HOME_DIR_PROPERTY,"\u0000");
			new PluginApplicationRunListener(mock(SpringApplication.class));
		} finally {
			if (oldValue == null) {
				System.clearProperty(PluginsClassLoader.HOME_DIR_PROPERTY);
			} else {
				System.setProperty(PluginsClassLoader.HOME_DIR_PROPERTY, oldValue);
			}
		}
		Assertions.assertNull(PluginsClassLoader.getInstance());
	}


}
