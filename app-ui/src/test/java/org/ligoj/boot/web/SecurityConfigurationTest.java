/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.ligoj.app.http.security.AbstractAuthenticationProvider;
import org.ligoj.app.http.security.SilentRequestHeaderAuthenticationFilter;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link SecurityConfiguration}
 */
@SpringBootTest
class SecurityConfigurationTest {

	@Test
	void getWhiteListPages() {
		var configuration = new SecurityConfiguration();
		configuration.setSecurityProvider("Rest");
		Assertions.assertEquals(SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PAGES_LOGIN, configuration.getWhiteListPages());
		configuration.setSecurityProvider("OAuth2Bff");
		Assertions.assertEquals(SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PAGES, configuration.getWhiteListPages());
		configuration.setSecurityProvider("Rest");
		configuration.setSecurityPreAuthPrincipal("SIMPLE");
		Assertions.assertEquals(SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PAGES, configuration.getWhiteListPages());
		configuration.setSecurityProvider("OAuth2Bff");
		Assertions.assertEquals(SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PAGES, configuration.getWhiteListPages());
	}

	@Test
	void configureLoginHandlerOAuthBff() throws Exception {
		var configuration = new SecurityConfiguration();
		configuration.setSecurityProvider("OAuth2Bff");
		var http = mock(HttpSecurity.class);
		var provider = mock(AbstractAuthenticationProvider.class);
		configuration.configureLoginHandler(http, provider, null, null);
		verify(http, times(1)).oauth2Login(any());
		verify(provider, times(0)).configureLogin(any(), any(), any(), any(), any());
	}

	@Test
	void configureLoginHandlerRest() throws Exception {
		var configuration = new SecurityConfiguration();
		configuration.setSecurityProvider("Rest");
		var http = mock(HttpSecurity.class);
		var provider = mock(AbstractAuthenticationProvider.class);
		configuration.configureLoginHandler(http, provider, null, null);
		verify(http, times(0)).oauth2Login(any());
		verify(provider, times(1)).configureLogin(any(), any(), any(), any(), any());
	}

}
