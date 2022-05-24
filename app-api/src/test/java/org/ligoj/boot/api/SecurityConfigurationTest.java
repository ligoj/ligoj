/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import java.util.HashMap;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;

/**
 * Test class of {@link SecurityConfiguration}
 */
class SecurityConfigurationTest {

	@Test
	void configure() throws Exception {
		@SuppressWarnings("unchecked")
		final ObjectPostProcessor<Object> proc = Mockito.mock(ObjectPostProcessor.class);
		Mockito.doAnswer(new Answer<>() {

			@Override
			public Object answer(InvocationOnMock invocation) throws Throwable {
				return invocation.getArgument(0);
			}
		}).when(proc).postProcess(Mockito.any());

		final var builder = new AuthenticationManagerBuilder(proc);
		final var applicationContext = Mockito.mock(ApplicationContext.class);
		final var authenticationManager = Mockito.mock(AuthenticationManager.class);
		Mockito.when(applicationContext.getBeanNamesForType(Mockito.any(Class.class))).thenReturn(new String[0]);
		final var map = new HashMap<Class<?>, Object>();
		map.put(ApplicationContext.class, applicationContext);
		map.put(AuthenticationManager.class, authenticationManager);
		final var security = new HttpSecurity(proc, builder, map);
		security.authenticationManager(authenticationManager);
		final var configuration = new SecurityConfiguration();

		configuration.filterChain(security);
		configuration.apiTokenFilter(authenticationManager);
		configuration.authenticationService();
		configuration.authorizingFilter();
		configuration.authenticationProvider();
		configuration.configureGlobal(builder);

		final var web = new WebSecurity(proc);
		configuration.webSecurityCustomizer().customize(web);
		;
	}

}
