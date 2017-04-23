package org.ligoj.app.resource.security;

import java.util.Collections;

import javax.transaction.Transactional;
import javax.ws.rs.core.Response;

import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
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
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

/**
 * Test of {@link SecurityResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@Rollback
public class SecurityResourceTest extends AbstractServerTest {

	@Test
	public void loginUnknownUser() throws Exception {
		thrown.expect(BadCredentialsException.class);
		final User user = new User();
		user.setName("any");
		user.setPassword("any");
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenThrow(new BadCredentialsException("any"));
		final SecurityResource resource = new SecurityResource();
		applicationContext.getAutowireCapableBeanFactory().autowireBean(resource);
		resource.iamProvider = new IamProvider[] { iamProvider };
		resource.login(user);
	}

	@Test
	public void login() throws Exception {
		
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
		Assert.assertNotNull(login);
		Assert.assertEquals(204, login.getStatus());
		
		// Check the contributor has been involed
		Mockito.verify(contributor).accept(ArgumentMatchers.any(), ArgumentMatchers.any());
	}

}
