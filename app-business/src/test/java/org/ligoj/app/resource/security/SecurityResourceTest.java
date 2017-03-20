package org.ligoj.app.resource.security;

import javax.transaction.Transactional;
import javax.ws.rs.core.Response;

import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.ldap.resource.RedirectResource;
import org.ligoj.app.resource.AbstractServerTest;
import org.ligoj.app.resource.session.User;

/**
 * Test of {@link SecurityResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@Rollback
public class SecurityResourceTest extends AbstractServerTest {

	@Autowired
	private RedirectResource redirectResource;

	@Test
	public void loginUnknownUser() throws Exception {
		thrown.expect(BadCredentialsException.class);
		final User user = new User("any", "any");
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenThrow(new BadCredentialsException("any"));
		final SecurityResource resource = new SecurityResource(iamProvider, null);
		resource.login(user);
	}

	@Test
	public void login() throws Exception {
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenAnswer(i->i.getArguments()[0]);
		final SecurityResource resource = new SecurityResource(iamProvider, redirectResource);
		final Response login = resource.login(new User("fdauganA", "Azerty01"));
		Assert.assertNotNull(login);
		Assert.assertNull(login.getCookies().get(RedirectResource.PREFERRED_COOKIE_HASH));
	}

	@Test
	public void loginRedirectCookie() throws Exception {
		initSpringSecurityContext("fdauganA");
		redirectResource.saveOrUpdate("http://localhost:1/any");
		final IamProvider iamProvider = Mockito.mock(IamProvider.class);
		Mockito.when(iamProvider.authenticate(ArgumentMatchers.any(Authentication.class))).thenAnswer(i->i.getArguments()[0]);
		final SecurityResource resource = new SecurityResource(iamProvider, redirectResource);
		final Response login = resource.login(new User("fdauganA", "Azerty01"));
		Assert.assertNotNull(login);
		Assert.assertNotNull(login.getCookies().get(RedirectResource.PREFERRED_COOKIE_HASH));
		Assert.assertTrue(login.getCookies().get(RedirectResource.PREFERRED_COOKIE_HASH).getValue().startsWith("fdauganA|"));

	}

}
