/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import java.util.IllegalFormatConversionException;

import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

/**
 * Check the SSO authentication {@link RestAuthenticationProvider} provider.
 */
public class RestAuthenticationProviderTest extends AbstractServerTest {

	private RestAuthenticationProvider authenticationProvider;

	@Test
	public void authenticate() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("junit", authentication.getName());
		Assertions.assertEquals("junit", authentication.getPrincipal().toString());

		Assertions.assertTrue(authenticationProvider.supports(Object.class));
	}

	private Authentication authenticate(final String host) {
		return authenticate(host, "junit");
	}

	private Authentication authenticate(final String host, final String user) {
		authenticationProvider.setSsoPostUrl(host + ":" + MOCK_PORT);
		authenticationProvider.setSsoWelcome(host + ":" + MOCK_PORT);
		return authenticationProvider.authenticate(prepareAuthentication(user));
	}

	@Test
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
		Assertions.assertThrows(IllegalFormatConversionException.class, () -> {
			authenticationProvider.authenticate(authentication);
		});
	}

	@Test
	public void authenticateIOE() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> {
			authenticate("der://localhost");
		});
	}

	@Test
	public void authenticateKo1() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_UNAUTHORIZED)));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> {
			authenticate("http://localhost");
		});
	}

	@Test
	public void authenticateMixedCase() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost", "jUniT");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("junit", authentication.getName());
		Assertions.assertEquals("junit", authentication.getPrincipal().toString());
	}

	@Test
	public void authenticateOverrideDifferentUser() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT).withHeader("X-Real-User", "other")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("other", authentication.getName());
		Assertions.assertEquals("other", authentication.getPrincipal().toString());
	}

	@Test
	public void authenticateOverrideSameUser() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT).withHeader("X-Real-User", "junit")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("junit", authentication.getName());
		Assertions.assertEquals("junit", authentication.getPrincipal().toString());
	}

	/**
	 * Initialize the mock server.
	 */
	@BeforeEach
	public void init() {
		authenticationProvider = new RestAuthenticationProvider();
		authenticationProvider.setSsoPostContent("");
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

}
