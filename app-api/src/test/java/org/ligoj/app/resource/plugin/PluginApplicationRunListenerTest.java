/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;

import java.net.URL;
import java.net.URLClassLoader;

import static org.mockito.Mockito.mock;

/**
 * Test class of {@link PluginApplicationRunListener}
 */
class PluginApplicationRunListenerTest {

	@Test
	void noPluginClassLoader() {
		try (var _ = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]))){
			Assertions.assertEquals(-10, new PluginApplicationRunListener(mock(SpringApplication.class)).getOrder());
		}
	}
}
