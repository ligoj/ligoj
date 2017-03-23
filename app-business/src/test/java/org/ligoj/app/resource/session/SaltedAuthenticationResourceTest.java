package org.ligoj.app.resource.session;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

import javax.naming.ldap.LdapName;
import javax.transaction.Transactional;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.app.AbstractAppTest;
import org.ligoj.app.ldap.dao.UserLdapRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import net.sf.ehcache.CacheManager;

/**
 * Test class of {@link SaltedAuthenticationResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@Rollback
public class SaltedAuthenticationResourceTest extends AbstractAppTest {

	@Before
	public void prepareData() throws IOException {
		// Only with Spring context
		persistEntities("csv/app-test", new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class },
				StandardCharsets.UTF_8.name());
		CacheManager.getInstance().getCache("ldap").removeAll();
		CacheManager.getInstance().getCache("ldap-user-repository").removeAll();

		// For the cache to be created
		getUser().findAll();
	}

	@Autowired
	private SaltedAuthenticationResource resource;

	@Test
	public void testGetToken() throws Exception {
		Assert.assertNotNull(StringUtils.trimToNull(resource.getSsoToken("jdupont")));
		Assert.assertNotNull(StringUtils.trimToNull(resource.getSsoToken("jdoe5")));
	}

	@Test
	public void testGetTokenFromUser() throws Exception {
		Assert.assertNull(resource.getSsoToken("any"));
		Assert.assertNull(resource.getSsoToken(null));
	}

	@Test(expected = AccessDeniedException.class)
	public void testCheckEmptyToken() throws Exception {
		Assert.assertNull(resource.checkSsoToken(null));
		Assert.assertNull(resource.checkSsoToken(""));
	}

	@Test
	public void testValidToken() throws Exception {
		Assert.assertEquals("jdupont", resource.checkSsoToken(resource.getSsoToken("jdupont")));
		Assert.assertEquals("jdoe5", resource.checkSsoToken(resource.getSsoToken("jdoe5")));
	}

	@Test(expected = AccessDeniedException.class)
	public void checkSsoTokenPasswordChanged() throws Exception  {
		final String token = resource.getSsoToken("hdurant");
		getUser().set(new LdapName("uid=hdurant,ou=gfi,ou=france,ou=people,dc=sample,dc=com"), "userPassword", "pwd");
		resource.checkSsoToken(token);
	}

	@Test(expected = AccessDeniedException.class)
	public void checkSsoTokenTooOldToken() throws Exception {
		getUser().set(new LdapName("uid=mmartin,ou=gfi,ou=france,ou=people,dc=sample,dc=com"), "userPassword", "pwd");
		final String token = getOldSsoToken("mmartin", "pwd");
		resource.checkSsoToken(token);
	}

	@Test(expected = AccessDeniedException.class)
	public void testNotExist() throws Exception {
		final String token = resource.getSsoToken("jdoe4");
		getUser().getTemplate().unbind("uid=jdoe4,ou=ing,ou=external,ou=people,dc=sample,dc=com");
		resource.checkSsoToken(token);
	}

	/**
	 * Return SSO token to use in cross site parameters valid for 30 minutes.
	 * 
	 * @param login
	 *            The login of the user
	 * @param userKey
	 *            The key of the user
	 * @return SSO token to use as cross site parameter.
	 */
	private String getOldSsoToken(final String login, final String userKey) throws Exception {
		// Uses a secure Random not a simple Random
		final SecureRandom random = SecureRandom.getInstance("SHA1PRNG");
		// Salt generation 64 bits long
		final byte[] bSalt = new byte[8];
		random.nextBytes(bSalt);
		// Digest computation
		final byte[] bDigest = resource.getHash(1000, login + userKey, bSalt);
		final String sDigest = resource.byteToBase64(bDigest);
		final String sSalt = resource.byteToBase64(bSalt);
		final long expire = System.currentTimeMillis() - DateUtils.MILLIS_PER_MINUTE * 31;

		// Generated an encrypted key, valid for 30 minutes
		return resource.encrypt(login + "|" + sDigest + "|" + sSalt + "|" + new String(Base64.encodeInteger(new BigInteger(String.valueOf(expire)))),
				"K%ë£/L@_§z3-Àçñ?");
	}

	/**
	 * User repository provider.
	 * 
	 * @return User repository provider.
	 */
	@Override
	protected UserLdapRepository getUser() {
		return (UserLdapRepository) super.getUser();
	}
}
