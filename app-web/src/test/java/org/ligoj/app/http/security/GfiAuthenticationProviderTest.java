package org.ligoj.app.http.security;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import java.security.GeneralSecurityException;

import org.apache.http.HttpStatus;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

import com.github.tomakehurst.wiremock.WireMockServer;

/**
 * Check the SSO authentication provider. Test class of {@link GfiAuthenticationProvider}
 */
public class GfiAuthenticationProviderTest {

	private WireMockServer httpServer = null;
	private static final int MOCK_PORT = 8121;
	private GfiAuthenticationProvider authenticationProvider;

	@Test
	public void testSupport() {
		Assert.assertTrue(authenticationProvider.supports(null));
	}

	@Test(expected = BadCredentialsException.class)
	public void authenticateIOE() throws GeneralSecurityException {
		authenticate("der://localhost");
	}

	@Test(expected = BadCredentialsException.class)
	public void authenticateKo1() throws GeneralSecurityException {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK)));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_MOVED_TEMPORARILY)));
		httpServer.start();
		authenticate("http://localhost");
	}

	@Test(expected = BadCredentialsException.class)
	public void authenticateKo2() throws GeneralSecurityException {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK)));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("something")));
		httpServer.start();
		authenticate("http://localhost");
	}

	@Test(expected = NullPointerException.class)
	public void authenticateInvalidHost() throws GeneralSecurityException {
		authenticationProvider.setSsoPostUrl("y");
		authenticationProvider.setSsoWelcome(null);
		authenticationProvider.afterPropertiesSet();
		authenticationProvider.authenticate(prepareAuthentication(""));
	}

	@Test
	public void authenticateX509() {
		final GfiAuthenticationProvider.X509TrustManager x509TrustManager = new GfiAuthenticationProvider.X509TrustManager();
		x509TrustManager.checkClientTrusted(null, null);
		x509TrustManager.checkServerTrusted(null, null);
		Assert.assertEquals(0, x509TrustManager.getAcceptedIssuers().length);
	}

	@Test
	public void authenticate() throws GeneralSecurityException {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK)));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assert.assertEquals("junit", authentication.getName());
		Assert.assertEquals("junit", authentication.getPrincipal().toString());
	}

	@Test
	public void authenticateMixedCase() throws GeneralSecurityException {
		httpServer.stubFor(get(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK)));
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost", "jUniT");
		Assert.assertEquals("junit", authentication.getName());
		Assert.assertEquals("junit", authentication.getPrincipal().toString());
	}

	private Authentication authenticate(final String host) throws GeneralSecurityException {
		return authenticate(host, "junit");
	}

	private Authentication authenticate(final String host, final String user) throws GeneralSecurityException {
		authenticationProvider.setSsoPostUrl(host + ":" + MOCK_PORT);
		authenticationProvider.setSsoWelcome(host + ":" + MOCK_PORT);
		authenticationProvider.afterPropertiesSet();
		return authenticationProvider.authenticate(prepareAuthentication(user));
	}

	/**
	 * Generate a mock authentication/
	 */
	private Authentication prepareAuthentication(final String user) {
		final Authentication authentication = Mockito.mock(Authentication.class);
		final Object credential = Mockito.mock(Object.class);
		Mockito.when(credential.toString()).thenReturn("");
		final Object principal = Mockito.mock(Object.class);
		Mockito.when(principal.toString()).thenReturn(user);
		Mockito.when(authentication.getCredentials()).thenReturn(credential);
		Mockito.when(authentication.getPrincipal()).thenReturn(principal);
		return authentication;
	}

	/**
	 * Initialize the mock server.
	 */
	@Before
	public void setup() {
		authenticationProvider = new GfiAuthenticationProvider();
		authenticationProvider.setSsoHeaders("any|value;other|data");
		authenticationProvider.setSsoPostContent("");

		// Only for coverage
		authenticationProvider.getSsoPostContent();
		authenticationProvider.getSsoPostUrl();
	}

	@Before
	public void prepareMockServer() {
		if (httpServer != null) {
			throw new IllegalStateException("A previous HTTP server was already created");
		}
		httpServer = new WireMockServer(MOCK_PORT);
		System.setProperty("http.keepAlive", "false");
	}

	/**
	 * Shutdown the mock server.
	 */
	@After
	public void shutDownMockServer() {
		System.clearProperty("http.keepAlive");
		if (httpServer != null) {
			httpServer.stop();
		}
	}
}
