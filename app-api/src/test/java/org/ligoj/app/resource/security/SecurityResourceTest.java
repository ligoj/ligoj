/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.security;

import java.util.Collections;

import org.springframework.transaction.annotation.Transactional;
import jakarta.ws.rs.core.Response;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.app.iam.IAuthenticationContributor;
import org.ligoj.app.iam.IamProvider;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test of {@link SecurityResource}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@Rollback
class SecurityResourceTest extends AbstractServerTest {

	@Test
	void loginUnknownUser() throws Exception {
		final User user = new User();
		user.setName("any");
		user.setPassword("any");
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenThrow(new BadCredentialsException("any"));
		final SecurityResource resource = new SecurityResource();
		applicationContext.getAutowireCapableBeanFactory().autowireBean(resource);
		resource.iamProvider = new IamProvider[] { iamProvider };
		Assertions.assertThrows(BadCredentialsException.class, () -> {
			resource.login(user);
		});
	}

	@Test
	void login() throws Exception {

		// Mock the authentication
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenAnswer(i -> i.getArguments()[0]);
		final SecurityResource resource = new SecurityResource();
		super.applicationContext.getAutowireCapableBeanFactory().autowireBean(resource);
		resource.iamProvider = new IamProvider[] { iamProvider };

		// Mock the contributor
		final IAuthenticationContributor contributor = Mockito.mock(IAuthenticationContributor.class);
		final ApplicationContext applicationContext = Mockito.mock(ApplicationContext.class);
		Mockito.when(applicationContext.getBeansOfType(IAuthenticationContributor.class))
				.thenAnswer(i -> Collections.singletonMap("some", contributor));
		resource.applicationContext = applicationContext;

		// Perform the login
		final Response login = resource.login(new User("fdauganA", "Azerty01"));

		// Check the response
		Assertions.assertNotNull(login);
		Assertions.assertEquals(204, login.getStatus());

		// Check the contributor has been involed
		Mockito.verify(contributor).accept(ArgumentMatchers.any(), ArgumentMatchers.any());
	}

}
