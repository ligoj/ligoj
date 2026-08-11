/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationContext;
import org.springframework.core.ResolvableType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.core.context.SecurityContextHolderStrategy;

import java.util.Map;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link SecurityConfiguration}
 */
class SecurityConfigurationTest {

	@SuppressWarnings("unchecked")
	@Test
	void configure() throws Exception {
		final ObjectPostProcessor<Object> processor = mock(ObjectPostProcessor.class);
		doAnswer((Answer<Object>) invocation -> invocation.getArgument(0)).when(processor).postProcess(any());

		final var builder = new AuthenticationManagerBuilder(processor);
		final var applicationContext = mock(ApplicationContext.class);
		final var authenticationManager = mock(AuthenticationManager.class);
		final var authenticationConfiguration = mock(AuthenticationConfiguration.class);
		when(applicationContext.getBeanNamesForType(any(Class.class))).thenReturn(new String[0]);
		final var security = new HttpSecurity(processor, builder,
				Map.of(ApplicationContext.class, applicationContext, AuthenticationManager.class, authenticationManager));
		security.authenticationManager(authenticationManager);
		final var configuration = new SecurityConfiguration();

		final var beanProvider = mock(ObjectProvider.class);
		when(applicationContext.getBeanProvider(any(ResolvableType.class))).thenReturn(beanProvider);
		final var beanProvider2 = mock(SecurityContextHolderStrategy.class);

		final var beanProvider3 = mock(ObjectProvider.class);
		when(applicationContext.getBeanProvider(SecurityContextHolderStrategy.class)).thenReturn(beanProvider3);
		when(beanProvider3.getIfUnique(any())).thenReturn(beanProvider2);

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
