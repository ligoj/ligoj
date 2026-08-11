/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.security.Principal;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Check the SSO authentication provider.
 */
class TrustedAuthenticationProviderTest {

	@Test
	void testAuthenticate() {
		final Authentication authentication = mock(Authentication.class);
		final Principal principal = mock(Principal.class);
		when(principal.toString()).thenReturn("junit");
		when(authentication.getPrincipal()).thenReturn(principal);
		final Authentication authenticate = new TrustedAuthenticationProvider().authenticate(authentication);
		Assertions.assertEquals("junit", authenticate.getPrincipal().toString());
	}

	@Test
	void testAuthenticateMixedCase() {
		final Authentication authentication = mock(Authentication.class);
		final Principal principal = mock(Principal.class);
		when(principal.toString()).thenReturn("jUniT");
		when(authentication.getPrincipal()).thenReturn(principal);
		final Authentication authenticate = new TrustedAuthenticationProvider().authenticate(authentication);
		Assertions.assertEquals("junit", authenticate.getPrincipal().toString());
	}
}
