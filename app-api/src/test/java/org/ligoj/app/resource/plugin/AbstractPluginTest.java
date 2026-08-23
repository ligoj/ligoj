/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.apache.commons.io.IOUtils;
import org.apache.hc.core5.http.HttpStatus;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.stubbing.Scenario.STARTED;

/**
 * Base test class for plugin search
 */
public abstract class AbstractPluginTest extends org.ligoj.bootstrap.AbstractServerTest {

	protected static final Integer PROXY_PORT = 8122;

	/**
	 * Stub Maven Central with local JSON response files.
	 * @param page0 Optional page result response file.
	 * @throws IOException When the file cannot be read.
	 */
	protected void stubMavenCentral(String page0) throws IOException {
		httpServer.stubFor(post(urlEqualTo("/api/internal/browse/components"))
				.inScenario("pager")
				.whenScenarioStateIs(STARTED)
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK)
						.withBody(IOUtils.toString(
								new ClassPathResource("mock-server/maven-repo/"+ (page0 == null ? "search.json": page0)).getInputStream(),
								StandardCharsets.UTF_8)))
				.willSetStateTo("page1"));
		httpServer.stubFor(post(urlEqualTo("/api/internal/browse/components"))
				.inScenario("pager")
				.whenScenarioStateIs("page1")
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK)
						.withBody(IOUtils.toString(
								new ClassPathResource("mock-server/maven-repo/search-empty.json").getInputStream(),
								StandardCharsets.UTF_8)))
				.willSetStateTo(STARTED));
	}
}
