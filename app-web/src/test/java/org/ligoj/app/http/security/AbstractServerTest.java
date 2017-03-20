package org.ligoj.app.http.security;

import org.junit.After;
import org.junit.Before;

import com.github.tomakehurst.wiremock.WireMockServer;

/**
 * Test using mock http server.
 */
public abstract class AbstractServerTest {
	protected static final int MOCK_PORT = 8121;

	protected WireMockServer httpServer;

	@Before
	public void prepareMockServer() {
		if (httpServer != null) {
			throw new IllegalStateException("A previous HTTP server was already created");
		}
		httpServer = new WireMockServer(MOCK_PORT);
		System.setProperty("http.keepAlive", "false");
	}

	@After
	public void shutDownMockServer() {
		System.clearProperty("http.keepAlive");
		if (httpServer != null) {
			httpServer.stop();
		}
	}

}
