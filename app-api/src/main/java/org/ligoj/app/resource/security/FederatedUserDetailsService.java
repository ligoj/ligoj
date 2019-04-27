/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.security;

import java.util.Optional;

import javax.cache.annotation.CacheKey;
import javax.cache.annotation.CacheResult;

import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.iam.UserOrg;
import org.ligoj.bootstrap.core.security.RbacUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

/**
 * Federated user details service resolving the right user name corresponding the authenticated local ID.
 */
@Component
public class FederatedUserDetailsService implements UserDetailsService {

	@Autowired
	protected RbacUserDetailsService federated;

	@Autowired
	protected IamProvider[] iamProvider;

	@Override
	@CacheResult(cacheName = "user-details")
	public UserDetails loadUserByUsername(@CacheKey final String username) {
		return federated.loadUserByUsername(Optional.ofNullable(iamProvider[0].getConfiguration().getUserRepository().findByIdNoCache(username))
				.map(UserOrg::getId).orElse(username));
	}

}
