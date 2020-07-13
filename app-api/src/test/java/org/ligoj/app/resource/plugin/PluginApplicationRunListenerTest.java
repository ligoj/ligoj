/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.security.NoSuchAlgorithmException;

import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

/**
 * Test class of {@link PluginApplicationRunListener}
 */
class PluginApplicationRunListenerTest {

	@Test
	void noPluginClassLoader() throws IOException, NoSuchAlgorithmException {
		final var scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]));
		try {
			Assertions.assertEquals(-10, new PluginApplicationRunListener(Mockito.mock(SpringApplication.class), new String[0]).getOrder());
		} finally {
			scope.close();
		}
	}
}
