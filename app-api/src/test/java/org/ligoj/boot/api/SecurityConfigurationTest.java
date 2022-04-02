/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import java.util.HashMap;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.config.annotation.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;

/**
 * Test class of {@link SecurityConfiguration}
 */
class SecurityConfigurationTest {

	@Test
	void configure() throws Exception {
		@SuppressWarnings("unchecked")
		final ObjectPostProcessor<Object> proc =  Mockito.mock(ObjectPostProcessor.class);
		final var builder = new AuthenticationManagerBuilder(proc);
		final var security = new HttpSecurity(proc, builder, new HashMap<>());
		final var configuration = new SecurityConfiguration();
		final var authenticationConfiguration = Mockito.mock(AuthenticationConfiguration.class);
		configuration.setAuthenticationConfiguration(authenticationConfiguration);
		configuration.configure(security);
		configuration.apiTokenFilter();
		configuration.authenticationService();
		configuration.authorizingFilter();
		configuration.authenticationProvider();
		configuration.configureGlobal(builder);

		final WebSecurity web = new WebSecurity(proc);
		configuration.configure(web);
	}

}
