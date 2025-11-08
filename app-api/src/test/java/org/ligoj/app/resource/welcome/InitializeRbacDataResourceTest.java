/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.welcome;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.bootstrap.dao.system.AuthorizationRepository;
import org.ligoj.bootstrap.dao.system.SystemRoleRepository;
import org.ligoj.bootstrap.dao.system.SystemUserRepository;
import org.ligoj.bootstrap.model.system.SystemAuthorization;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.ligoj.bootstrap.resource.system.api.ApiTokenResource;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.security.GeneralSecurityException;

/**
 * Test class of {@link InitializeRbacDataResource}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
class InitializeRbacDataResourceTest extends AbstractServerTest {

	private static final String NEW_ROLE = "NEW_ROLE";
	private static final String NEW_USER = "NEW_USER";

	@Autowired
	private InitializeRbacDataResource resource;

	@Autowired
	private ConfigurationResource configuration;


	@Autowired
	private SystemRoleRepository roleRepository;

	@Autowired
	private AuthorizationRepository authorizationRepository;

	@Autowired
	private SystemUserRepository userRepository;

	@Autowired
	private ApiTokenResource tokenResource;

	@Test
	void getInstalledEntities() {
		Assertions.assertTrue(resource.getInstalledEntities().contains(SystemUser.class));
	}

	@Test
	void getKey() {
		Assertions.assertEquals("feature:welcome:data-rbac", resource.getKey());
	}

	@Test
	void getName() {
		Assertions.assertEquals("Welcome Data RBAC", resource.getName());
	}

	@Test
	void installWithoutInitialization() throws GeneralSecurityException {
		resource.install();
	}

	@Test
	void installInit() throws GeneralSecurityException {
		Assertions.assertNull(roleRepository.findByName(NEW_ROLE));
		Assertions.assertNull(userRepository.findOne(NEW_USER));
		configuration.put("ligoj.initial.user.action", "init");
		configuration.put("ligoj.initial.user.role", NEW_ROLE);
		configuration.put("ligoj.initial.user.name", NEW_USER);
		configuration.put("ligoj.initial.user.token.name", "TOKEN_NAME");
		resource.install();
		Assertions.assertNotNull(roleRepository.findByName(NEW_ROLE));
		Assertions.assertNotNull(userRepository.findOne(NEW_USER));
	}

	@Test
	void installReset() throws GeneralSecurityException {
		configuration.put("ligoj.initial.user.action", "reset");
		configuration.put("ligoj.initial.user.role", NEW_ROLE);
		configuration.put("ligoj.initial.user.name", NEW_USER);
		configuration.put("ligoj.initial.user.token.name", "TOKEN_NAME");

		resource.install();

		var newRole = roleRepository.findByName(NEW_ROLE);
		Assertions.assertNotNull(newRole);
		var uiAuth = authorizationRepository.findAllByLogin(NEW_USER, SystemAuthorization.AuthorizationType.UI);
		var apiAuth = authorizationRepository.findAllByLogin(NEW_USER, SystemAuthorization.AuthorizationType.UI);
		Assertions.assertEquals(".*", uiAuth.getFirst().getPattern());
		Assertions.assertEquals(".*", apiAuth.getFirst().getPattern());

		// Init again, with forced token value
		configuration.put("ligoj.initial.user.token.value", "RANDOM_TEST");
		resource.install();
		Assertions.assertEquals("RANDOM_TEST", tokenResource.getToken("TOKEN_NAME", NEW_USER));

		// Init again, with another token mode
		configuration.put("ligoj.initial.user.token.name", "TOKEN_NAME2");
		configuration.put("ligoj.initial.user.token.value", "RANDOM_TEST2");
		resource.install();
		Assertions.assertEquals("RANDOM_TEST2", tokenResource.getToken("TOKEN_NAME2", NEW_USER));

		// Init again, with created role and updated token value to be generated
		configuration.put("ligoj.initial.user.token.name", "TOKEN_NAME");
		configuration.put("ligoj.initial.user.token.value", null);
		resource.install();
		var newTokenValue = tokenResource.getToken("TOKEN_NAME", NEW_USER);
		Assertions.assertNotEquals("RANDOM_TEST", newTokenValue);

		// Init again, with init mode
		configuration.put("ligoj.initial.user.action", "init");
		configuration.put("ligoj.initial.user.role", "NEW_ROLE2");
		em.flush();
		em.clear();
		userRepository.findOne(NEW_USER);
		resource.install();
		Assertions.assertEquals(newTokenValue, tokenResource.getToken("TOKEN_NAME", NEW_USER));
	}

}
