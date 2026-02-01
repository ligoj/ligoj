/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.http.security.AbstractAuthenticationProvider;
import org.ligoj.app.http.security.SilentRequestHeaderAuthenticationFilter;
import org.mockito.Mockito;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test class of {@link SecurityConfiguration}
 */
@ExtendWith(SpringExtension.class)
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
		var http = Mockito.mock(HttpSecurity.class);
		var provider = Mockito.mock(AbstractAuthenticationProvider.class);
		configuration.configureLoginHandler(http, provider, null);
		Mockito.verify(http, Mockito.times(1)).oauth2Login(Mockito.any());
		Mockito.verify(provider, Mockito.times(0)).configureLogin(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
	}

	@Test
	void configureLoginHandlerRest() throws Exception {
		var configuration = new SecurityConfiguration();
		configuration.setSecurityProvider("Rest");
		var http = Mockito.mock(HttpSecurity.class);
		var provider = Mockito.mock(AbstractAuthenticationProvider.class);
		configuration.configureLoginHandler(http, provider, null);
		Mockito.verify(http, Mockito.times(0)).oauth2Login(Mockito.any());
		Mockito.verify(provider, Mockito.times(1)).configureLogin(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
	}

}
