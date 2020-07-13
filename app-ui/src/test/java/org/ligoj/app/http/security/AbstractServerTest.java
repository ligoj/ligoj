/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import com.github.tomakehurst.wiremock.WireMockServer;

/**
 * Test using mock http server.
 */
abstract class AbstractServerTest {
	protected static final int MOCK_PORT = 8120;

	protected WireMockServer httpServer;

	@BeforeEach
	void prepareMockServer() {
		if (httpServer != null) {
			throw new IllegalStateException("A previous HTTP server was already created");
		}
		httpServer = new WireMockServer(MOCK_PORT);
		System.setProperty("http.keepAlive", "false");
	}

	@AfterEach
	void shutDownMockServer() {
		System.clearProperty("http.keepAlive");
		if (httpServer != null) {
			httpServer.stop();
		}
	}

}
