package org.ligoj.app.http.security;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import javax.servlet.http.HttpServletRequest;

import org.apache.http.HttpStatus;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;

/**
 * Test class of {@link DigestAuthenticationFilter}
 */
public class DigestAuthenticationFilterTest extends AbstractServerTest {

	private DigestAuthenticationFilter filter;

	@Test(expected = BadCredentialsException.class)
	public void testAuthenticateIOE() {
		authenticate("der://localhost", "token");
	}

	@Test(expected = BadCredentialsException.class)
	public void testAuthenticateKo1() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_MOVED_TEMPORARILY)));
		httpServer.start();
		authenticate("http://localhost", "token");
	}

	@Test(expected = IllegalStateException.class)
	public void testAuthenticateInvalidHost() {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("")));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		filter.setAuthenticationManager(authentication -> {
			throw new IllegalStateException();
		});
		authenticate("http://localhost", "token");
	}

	@Test(expected = BadCredentialsException.class)
	public void testNoToken() {
		authenticate("http://localhost", null);
	}

	@Test
	public void testAuthenticateOk() {
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
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		Mockito.when(request.getParameter("token")).thenReturn(token);
		return request;
	}

	/**
	 * Initialize the mock server.
	 */
	@Before
	public void setup() {
		filter = new DigestAuthenticationFilter();
	}

}
