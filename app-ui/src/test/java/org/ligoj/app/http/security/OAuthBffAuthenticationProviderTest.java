/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import static org.mockito.Mockito.*;

/**
 * Check authentication {@link OAuth2BffAuthenticationProvider} provider.
 */
class OAuthBffAuthenticationProviderTest extends AbstractServerTest {

	private OAuth2BffAuthenticationProvider authenticationProvider;

	@Test
	void configureLogin() {
		Assertions.assertNotNull(authenticationProvider.configureLogin(mock(HttpSecurity.class), null, null, null, null));
	}

	@Test
	void authenticate() {
		Assertions.assertNull(authenticationProvider.authenticate(null));
	}

	@SuppressWarnings("unchecked")
	@Test
	void configureLogout() throws Exception {
		var http = mock(HttpSecurity.class);
		var clientRegistrationRepository = mock(ClientRegistrationRepository.class);
		var configurer = mock(LogoutConfigurer.class);
		authenticationProvider.clientRegistrationRepository = clientRegistrationRepository;

		// noinspection unchecked
		doAnswer(invocation -> {
			// noinspection unchecked
			((Customizer<Object>) invocation.getArgument(0)).customize(configurer);
			return null;
		}).when(http).logout(any(Customizer.class));
		Assertions.assertNull(authenticationProvider.configureLogout(http, null, null));
		verify(configurer).logoutSuccessHandler(any(OidcClientInitiatedLogoutSuccessHandler.class));
	}

	/**
	 * Initialize the mock server.
	 */
	@BeforeEach
	void init() {
		authenticationProvider = new OAuth2BffAuthenticationProvider();
	}

}
