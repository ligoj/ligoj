/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

import java.net.URL;
import java.net.URLClassLoader;

/**
 * Test class of {@link PluginApplicationRunListener}
 */
class PluginApplicationRunListenerTest {

	@Test
	void noPluginClassLoader() {
		try (var scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]))){
			Assertions.assertEquals(-10, new PluginApplicationRunListener(Mockito.mock(SpringApplication.class), new String[0]).getOrder());
		}
	}
}
