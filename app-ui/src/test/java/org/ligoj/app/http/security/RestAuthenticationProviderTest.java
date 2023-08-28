/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.mockito.exceptions.base.MockitoException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.io.IOException;
import java.util.Collection;
import java.util.IllegalFormatConversionException;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * Check the SSO authentication {@link RestAuthenticationProvider} provider.
 */
class RestAuthenticationProviderTest extends AbstractServerTest {

	private RestAuthenticationProvider authenticationProvider;

	@Test
	void authenticate() {
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
	void authenticateInvalidException() {
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
		Assertions.assertThrows(IllegalFormatConversionException.class, () -> authenticationProvider.authenticate(authentication));
	}

	@Test
	void authenticateIOE() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("//OK")));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("der://localhost"));
	}

	@Test
	void authenticateOther() {
		final var filter = new RestAuthenticationProvider();
		filter.setSsoPostUrl("der://localhost:" + MOCK_PORT);
		@SuppressWarnings("unchecked") final Collection<? extends GrantedAuthority> authorities = Mockito.mock(Collection.class);
		final var ioe = Mockito.mock(RuntimeException.class);
		Mockito.doThrow(new IOException()).when(ioe).toString();
		Mockito.doThrow(ioe).when(authorities).iterator();
		Assertions.assertThrows(MockitoException.class, () -> filter.authenticate("", "", authorities));
	}

	@Test
	void authenticateKo1() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_UNAUTHORIZED)));
		httpServer.start();
		Assertions.assertThrows(BadCredentialsException.class, () -> authenticate("http://localhost"));
	}

	@Test
	void authenticateMixedCase() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost", "jUniT");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("junit", authentication.getName());
		Assertions.assertEquals("junit", authentication.getPrincipal().toString());
	}

	@Test
	void authenticateOverrideDifferentUser() {
		httpServer.stubFor(post(urlPathEqualTo("/")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT).withHeader("X-Real-User", "other")));
		httpServer.start();
		final Authentication authentication = authenticate("http://localhost");
		Assertions.assertNotNull(authentication);
		Assertions.assertEquals("other", authentication.getName());
		Assertions.assertEquals("other", authentication.getPrincipal().toString());
	}

	@Test
	void authenticateOverrideSameUser() {
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
	void init() {
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
