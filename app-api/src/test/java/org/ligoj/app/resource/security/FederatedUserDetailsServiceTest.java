/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.security;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.ligoj.app.iam.IUserRepository;
import org.ligoj.app.iam.IamConfiguration;
import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.iam.UserOrg;
import org.ligoj.bootstrap.core.security.RbacUserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test of {@link FederatedUserDetailsService}
 */
class FederatedUserDetailsServiceTest {

	@Test
	void loadUserByUsername() {
		final var service = new FederatedUserDetailsService();
		final var federated = mock(RbacUserDetailsService.class);
		service.federated = federated;
		final var provider = mock(IamProvider.class);
		service.iamProvider = new IamProvider[] { provider };
		var configuration = mock(IamConfiguration.class);
		when(provider.getConfiguration()).thenReturn(configuration);
		var repository = mock(IUserRepository.class);
		when(configuration.getUserRepository()).thenReturn(repository);
		var userOrg = new UserOrg();
		userOrg.setName("federated");
		when(repository.findByIdNoCache("jdoe")).thenReturn(userOrg);
		var details = mock(UserDetails.class);
		when(federated.loadUserByUsername("federated")).thenReturn(details);
		Assertions.assertSame(details, service.loadUserByUsername("jdoe"));
	}

	@Test
	void loadUserByUsernameNotFederated() {
		final var service = new FederatedUserDetailsService();
		final var federated = mock(RbacUserDetailsService.class);
		service.federated = federated;
		final var provider = mock(IamProvider.class);
		service.iamProvider = new IamProvider[] { provider };
		var configuration = mock(IamConfiguration.class);
		when(provider.getConfiguration()).thenReturn(configuration);
		var repository = mock(IUserRepository.class);
		when(configuration.getUserRepository()).thenReturn(repository);
		var details = mock(UserDetails.class);
		when(federated.loadUserByUsername("jdoe")).thenReturn(details);
		Assertions.assertSame(details, service.loadUserByUsername("jdoe"));
	}

}
