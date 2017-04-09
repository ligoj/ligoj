package org.ligoj.app.http.security;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import java.util.IllegalFormatConversionException;

import org.apache.http.HttpStatus;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

/**
 * Check the SSO authentication {@link RestAuthenticationProvider} provider.
 */
public class RestAuthenticationProviderTest extends AbstractServerTest {

	private RestAuthenticationProvider authenticationProvider;

	@Test(expected = BadCredentialsException.class)
	public void authenticateIOE() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		authenticate("der://localhost");
	}

	@Test(expected = IllegalFormatConversionException.class)
	public void authenticateInvalidException() {
		authenticationProvider.setSsoPostUrl("");
		authenticationProvider.setSsoWelcome("");
		authenticationProvider.setSsoPostContent("%d%d");
		final Authentication authentication = Mockito.mock(Authentication.class);
		final Object credential = Mockito.mock(Object.class);
		Mockito.when(credential.toString()).thenReturn("");
		final Object principal = Mockito.mock(Object.class);
		Mockito.when(principal.toString()).thenReturn(null);
		Mockito.when(authentication.getCredentials()).thenReturn(credential);
		Mockito.when(authentication.getPrincipal()).thenReturn(principal);
		authenticationProvider.authenticate(authentication);
	}

	@Test(expected = BadCredentialsException.class)
	public void authenticateKo1() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_UNAUTHORIZED)));
		httpServer.start();
		authenticate("http://localhost");
	}

	@Test
	public void authenticate() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assert.assertNotNull(authentication);
		Assert.assertEquals("junit", authentication.getName());
		Assert.assertEquals("junit", authentication.getPrincipal().toString());

		Assert.assertTrue(authenticationProvider.supports(Object.class));
	}

	@Test
	public void authenticateOverrideSameUser() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT).withHeader("X-Real-User", "junit")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assert.assertNotNull(authentication);
		Assert.assertEquals("junit", authentication.getName());
		Assert.assertEquals("junit", authentication.getPrincipal().toString());
	}

	@Test
	public void authenticateOverrideDifferentUser() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT).withHeader("X-Real-User", "other")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assert.assertNotNull(authentication);
		Assert.assertEquals("other", authentication.getName());
		Assert.assertEquals("other", authentication.getPrincipal().toString());
	}

	@Test
	public void authenticateMixedCase() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost", "jUniT");
		Assert.assertNotNull(authentication);
		Assert.assertEquals("junit", authentication.getName());
		Assert.assertEquals("junit", authentication.getPrincipal().toString());
	}

	private Authentication authenticate(final String host) {
		return authenticate(host, "junit");
	}

	private Authentication authenticate(final String host, final String user) {
		authenticationProvider.setSsoPostUrl(host + ":" + MOCK_PORT);
		authenticationProvider.setSsoWelcome(host + ":" + MOCK_PORT);
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
		authenticationProvider = new RestAuthenticationProvider();
		authenticationProvider.setSsoPostContent("");
	}

}
