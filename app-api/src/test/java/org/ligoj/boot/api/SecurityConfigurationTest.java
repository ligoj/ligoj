/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.mockito.stubbing.Answer;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;

import java.util.Map;

/**
 * Test class of {@link SecurityConfiguration}
 */
class SecurityConfigurationTest {

	@Test
	void configure() throws Exception {
		@SuppressWarnings("unchecked") final ObjectPostProcessor<Object> processor = Mockito.mock(ObjectPostProcessor.class);
		Mockito.doAnswer((Answer<Object>) invocation -> invocation.getArgument(0)).when(processor).postProcess(Mockito.any());

		final var builder = new AuthenticationManagerBuilder(processor);
		final var applicationContext = Mockito.mock(ApplicationContext.class);
		final var authenticationManager = Mockito.mock(AuthenticationManager.class);
		final var authenticationConfiguration = Mockito.mock(AuthenticationConfiguration.class);
		Mockito.when(applicationContext.getBeanNamesForType(Mockito.any(Class.class))).thenReturn(new String[0]);
		final var security = new HttpSecurity(processor, builder, Map.of(ApplicationContext.class, applicationContext, AuthenticationManager.class, authenticationManager));
		security.authenticationManager(authenticationManager);
		final var configuration = new SecurityConfiguration();

		Assertions.assertNotNull(configuration.filterChain(security));
		configuration.apiTokenFilter(authenticationManager);
		configuration.authenticationService();
		configuration.authorizingFilter();
		configuration.authenticationProvider();
		configuration.configureGlobal(builder);
		configuration.webSecurityCustomizer().customize(new WebSecurity(processor));
		configuration.authenticationManager(authenticationConfiguration);
	}

}
