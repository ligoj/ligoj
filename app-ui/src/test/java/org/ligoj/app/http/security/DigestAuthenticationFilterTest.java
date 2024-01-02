/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import org.apache.http.HttpStatus;
import org.apache.http.impl.client.CloseableHttpClient;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

import java.io.IOException;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * Test class of {@link DigestAuthenticationFilter}
 */
class DigestAuthenticationFilterTest extends AbstractServerTest {

	private DigestAuthenticationFilter filter;

	@Test
	void authenticateIOE() {
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("der://localhost", "token"));
	}

	@Test
	void authenticateIOE2() {
		final var ioe = new IOException() {
			@Override
			public java.lang.String toString() {
				throw new RuntimeException();
			}
		};

		filter = new DigestAuthenticationFilter() {
			@Override
			protected Authentication doLogin(final CloseableHttpClient httpClient, final String token) throws IOException {
				throw ioe;
			}
		};
		filter.setSsoPostUrl("der://localhost:" + MOCK_PORT);
		filter.afterPropertiesSet();
		final var authenticationManager = Mockito.mock(AuthenticationManager.class);
		filter.setAuthenticationManager(authenticationManager);
		final var req = newRequest("token");
		Assertions.assertThrows(RuntimeException.class, () -> filter.attemptAuthentication(req, null));
	}

	@Test
	void authenticateNot200OK() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_MOVED_TEMPORARILY)));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("http://localhost", "token"));
	}

	@Test
	void authenticateRE() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("")));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		filter.setAuthenticationManager(authentication -> {
			throw new IllegalStateException();
		});
		Assertions.assertThrows(IllegalStateException.class, () -> authenticate("http://localhost", "token"));
	}

	@Test
	void authenticateNoToken() {
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("http://localhost", null));
	}

	@Test
	void authenticateOk() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("")));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		Assertions.assertEquals("//OK", authenticate("http://localhost", "token").getPrincipal());
	}

	private Authentication authenticate(final String host, final String token) {
		filter.setSsoPostUrl(host + ":" + MOCK_PORT);
		filter.afterPropertiesSet();
		return filter.attemptAuthentication(newRequest(token), null);
	}

	/**
	 * Generate a mock authentication/
	 */
	private HttpServletRequest newRequest(final String token) {
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.when(request.getParameter("token")).thenReturn(token);
		return request;
	}

	/**
	 * Initialize the mock server.
	 */
	@BeforeEach
	void init() {
		filter = new DigestAuthenticationFilter();
	}

}
