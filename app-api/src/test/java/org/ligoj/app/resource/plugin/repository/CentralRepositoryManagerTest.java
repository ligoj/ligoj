/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.apache.commons.io.IOUtils;
import org.apache.hc.core5.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.resource.plugin.AbstractPluginTest;
import org.ligoj.bootstrap.model.system.SystemConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * Test class of {@link CentralRepositoryManager}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
class CentralRepositoryManagerTest extends AbstractPluginTest {

	@Autowired
	private CentralRepositoryManager resource;

	@BeforeEach
	void prepareData() throws IOException {
		persistEntities("csv-test", new Class<?>[]{SystemConfiguration.class}, StandardCharsets.UTF_8);
	}

	@Test
	void invalidateLastPluginVersions() throws IOException {
		stubMavenCentral(null);
		httpServer.start();
		resource.invalidateLastPluginVersions();
		final var versions = resource.getLastPluginVersions();
		Assertions.assertEquals(2, versions.size());
		Assertions.assertEquals(versions.keySet(), resource.getLastPluginVersions().keySet());
		resource.invalidateLastPluginVersions();
		Assertions.assertEquals(versions.keySet(), resource.getLastPluginVersions().keySet());
	}

	@Test
	void testProxy() throws IOException {

		// set proxy configuration and proxy server
		System.setProperty("plugins.repository-manager.central.search.proxy.host", "localhost");
		System.setProperty("plugins.repository-manager.central.search.proxy.port", String.valueOf(PROXY_PORT));
		System.setProperty("plugins.repository-manager.central.artifact.proxy.host", "localhost");
		System.setProperty("plugins.repository-manager.central.artifact.proxy.port", String.valueOf(PROXY_PORT));
		final var proxyServer = new WireMockServer(PROXY_PORT);
		try {
			proxyServer.stubFor(
					get(WireMock.urlMatching(".*")).willReturn(aResponse().proxiedFrom("http://localhost:" + MOCK_PORT)));
			proxyServer.start();

			// set main http server
			httpServer.stubFor(get(urlEqualTo("/maven2/org/ligoj/plugin/plugin-ui/1.0.0/plugin-ui-1.0.0.jar"))
					.willReturn(aResponse().withStatus(HttpStatus.SC_OK)
							.withBody("OK")));
			stubMavenCentral(null);
			httpServer.start();
			resource.invalidateLastPluginVersions();
			final var versions = resource.getLastPluginVersions();
			Assertions.assertEquals(versions.keySet(), resource.getLastPluginVersions().keySet());
			resource.invalidateLastPluginVersions();
			try (InputStream stream = resource.getArtifactInputStream("org.ligoj.plugin", "plugin-ui", "1.0.0", null)) {
				Assertions.assertEquals("OK", IOUtils.toString(stream, StandardCharsets.UTF_8));
			}
		} finally {
			// clean proxy configuration
			System.clearProperty("plugins.repository-manager.central.search.proxy.host");
			System.clearProperty("plugins.repository-manager.central.search.proxy.port");
			System.clearProperty("plugins.repository-manager.central.artifact.proxy.host");
			System.clearProperty("plugins.repository-manager.central.artifact.proxy.port");
			try {
				proxyServer.stop();
			} catch (Exception _) {
				// Ignore
			}
		}
	}
}
