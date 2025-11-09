/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.welcome;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.iam.model.DelegateOrg;
import org.ligoj.app.model.DelegateNode;
import org.ligoj.bootstrap.core.plugin.FeaturePlugin;
import org.ligoj.bootstrap.dao.system.SystemApiTokenRepository;
import org.ligoj.bootstrap.dao.system.SystemRoleRepository;
import org.ligoj.bootstrap.dao.system.SystemUserRepository;
import org.ligoj.bootstrap.model.system.SystemAuthorization;
import org.ligoj.bootstrap.model.system.SystemRole;
import org.ligoj.bootstrap.model.system.SystemRoleAssignment;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.ligoj.bootstrap.resource.system.api.ApiTokenResource;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.ligoj.bootstrap.resource.system.security.AuthorizationEditionVo;
import org.ligoj.bootstrap.resource.system.security.RoleResource;
import org.ligoj.bootstrap.resource.system.security.SystemRoleVo;
import org.ligoj.bootstrap.resource.system.user.SystemUserEditionVo;
import org.ligoj.bootstrap.resource.system.user.UserResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Initialize during the RBAC data on installation.
 */
@Log4j2
@Component
public class InitializeRbacDataResource implements FeaturePlugin {

	/**
	 * Initial Ligoj user and token created during the first installation.
	 */
	private static final String INITIAL_USER_NAME_PROPERTY = "ligoj.initial.user.name";
	private static final String INITIAL_ROLE_NAME_PROPERTY = "ligoj.initial.user.role";
	private static final String INITIAL_TOKEN_NAME_PROPERTY = "ligoj.initial.user.token.name";
	private static final String INITIAL_TOKEN_VALUE_PROPERTY = "ligoj.initial.user.token.value";
	private static final String INITIAL_USER_ACTION_PROPERTY = "ligoj.initial.user.action";

	private static final String INITIAL_USER_ACTION_RESET = "reset";
	private static final String INITIAL_USER_ACTION_INIT = "init";

	private static final String DEFAULT_USER_NAME = "ligoj-admin";
	private static final String DEFAULT_ROLE_NAME = "ADMIN";
	private static final String DEFAULT_TOKEN_NAME = "auto-install";

	@Autowired
	private ConfigurationResource configuration;

	@Autowired
	private SystemRoleRepository roleRepository;

	@Autowired
	private UserResource userResource;

	@Autowired
	private RoleResource roleResource;

	@Autowired
	private ApiTokenResource apiTokenResource;

	@Autowired
	protected SystemApiTokenRepository apiTokenRepository;

	@Autowired
	private SystemUserRepository userRepository;

	@Override
	public String getKey() {
		return "feature:welcome:data-rbac";
	}

	@Override
	public List<Class<?>> getInstalledEntities() {
		return Arrays.asList(SystemUser.class, SystemRole.class, SystemAuthorization.class, SystemRoleAssignment.class, DelegateOrg.class,
				DelegateNode.class);
	}

	@Override
	public String getName() {
		return "Welcome Data RBAC";
	}

	private void createUser(String customUser, String customRole, Integer roleId) throws GeneralSecurityException {
		var user = userRepository.findOne(customUser);
		final var userVo = new SystemUserEditionVo();
		userVo.setLogin(customUser);
		userVo.setRoles(Set.of(roleId));
		if (user == null) {
			userResource.create(userVo);
			log.info("[INIT] User '{}' has been created with role '{}'", customUser, customRole);
		} else if (user.getRoles().stream().noneMatch(a -> a.getRole().getId() == roleId.intValue())) {
			userResource.create(userVo);
			log.info("[INIT] User '{}' has received role '{}'", customUser, customRole);
		}
	}

	private Integer createRole(String customRole) {
		var role = roleRepository.findByName(customRole);
		final int roleId;
		if (role == null) {
			var roleVo = new SystemRoleVo();
			roleVo.setName(customRole);
			var uiAuthorization = new AuthorizationEditionVo();
			uiAuthorization.setPattern(".*");
			uiAuthorization.setType(SystemAuthorization.AuthorizationType.UI);

			var apiAuthorization = new AuthorizationEditionVo();
			apiAuthorization.setPattern(".*");
			apiAuthorization.setType(SystemAuthorization.AuthorizationType.API);

			var authorizations = List.of(uiAuthorization, apiAuthorization);
			roleVo.setAuthorizations(authorizations);
			roleId = roleResource.create(roleVo);
			log.info("[INIT] Role '{}' has been created", customRole);
		} else {
			roleId = role.getId();
		}
		return roleId;
	}

	private void createToken(String action, String customUser) throws GeneralSecurityException {
		var tokenName = configuration.get(INITIAL_TOKEN_NAME_PROPERTY, DEFAULT_TOKEN_NAME);
		var tokenValue = configuration.get(INITIAL_TOKEN_VALUE_PROPERTY);
		var token = apiTokenRepository.findByUserAndName(customUser, tokenName);
		String newTokenValue = null;
		if (token == null) {
			if (StringUtils.isBlank(tokenValue)) {
				// Generate a new token if it does not exist for this user
				newTokenValue = apiTokenResource.create(customUser, tokenName).getId();
			} else {
				// Create a token from a provided token value
				apiTokenResource.create(customUser, tokenName, tokenValue).getId();
			}
		} else if (INITIAL_USER_ACTION_RESET.equals(action)) {
			if (StringUtils.isBlank(tokenValue)) {
				// Generate a new token if it does not exist for this user
				newTokenValue = apiTokenResource.update(customUser, tokenName);
			} else {
				// Create a token from a provided token value
				apiTokenResource.update(customUser, tokenName, tokenValue);
			}
		} else {
			// In non-"reset" mode, no logs are produced
			return;
		}
		if (newTokenValue == null) {
			log.info("[INIT] Token '{}' has been set for initial user '{}' to desired value", tokenName, customUser);
		} else {
			log.info("[INIT] Token '{}' has been set for initial user '{}' to value: {}", tokenName, customUser, newTokenValue);
		}
	}

	@Override
	public void install() throws GeneralSecurityException {
		var customUser = configuration.get(INITIAL_USER_NAME_PROPERTY, DEFAULT_USER_NAME);
		var customRole = configuration.get(INITIAL_ROLE_NAME_PROPERTY, DEFAULT_ROLE_NAME);
		var action = configuration.get(INITIAL_USER_ACTION_PROPERTY);
		if (!INITIAL_USER_ACTION_INIT.equals(action) && !INITIAL_USER_ACTION_RESET.equals(action)) {
			return;
		}

		// Create the role as needed
		final int roleId = createRole(customRole);

		// Create the user as needed
		createUser(customUser, customRole, roleId);

		// Create the user token as needed
		createToken(action, customUser);
	}

}
