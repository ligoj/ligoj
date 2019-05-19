/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import javax.servlet.http.HttpServletRequest;

import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;

/**
 * Test class of {@link DigestAuthenticationFilter}
 */
public class DigestAuthenticationFilterTest extends AbstractServerTest {

	private DigestAuthenticationFilter filter;

	@Test
	void authenticateIOE() {
		Assertions.assertThrows(BadCredentialsException.class, () -> {
			authenticate("der://localhost", "token");
		});
	}

	@Test
	void authenticateNot200OK() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_MOVED_TEMPORARILY)));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("http://localhost", "token"));
	}

	@Test
	void authenticateInvalidHost() {
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
		authenticate("http://localhost", "token");
	}

	private void authenticate(final String host, final String token) {
		filter.setSsoPostUrl(host + ":" + MOCK_PORT);
		filter.afterPropertiesSet();
		filter.attemptAuthentication(newRequest(token), null);
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
