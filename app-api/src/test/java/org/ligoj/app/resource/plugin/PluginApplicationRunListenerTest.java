package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;

import org.eclipse.jetty.util.thread.ThreadClassLoaderScope;
import org.junit.Assert;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

/**
 * Test class of {@link PluginApplicationRunListener}
 */
public class PluginApplicationRunListenerTest {

	@Test
	public void noPluginClassLoader() throws IOException {
		final ThreadClassLoaderScope scope = new ThreadClassLoaderScope(new URLClassLoader(new URL[0]));
		try {
			new PluginApplicationRunListener(Mockito.mock(SpringApplication.class), new String[0]).starting();
		} finally {
			scope.close();
		}
	}

	@Test
	public void pluginClassLoader() throws IOException {
		final ThreadClassLoaderScope scope = new ThreadClassLoaderScope(new PluginsClassLoader());
		try {
			final PluginApplicationRunListener listener = new PluginApplicationRunListener(Mockito.mock(SpringApplication.class), new String[0]);
			listener.starting();
			Assert.assertTrue(listener.getOrder() < 0);
			listener.environmentPrepared(null);
			listener.contextPrepared(null);
			listener.contextLoaded(null);
			listener.finished(null, null);
		} finally {
			scope.close();
		}
	}
}
