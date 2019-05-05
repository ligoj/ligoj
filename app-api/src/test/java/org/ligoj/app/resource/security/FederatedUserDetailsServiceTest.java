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
import org.mockito.Mockito;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Test of {@link FederatedUserDetailsService}
 */
public class FederatedUserDetailsServiceTest {

	@Test
	public void loadUserByUsername() {
		final var service = new FederatedUserDetailsService();
		final var federated = Mockito.mock(RbacUserDetailsService.class);
		service.federated = federated;
		final var provider = Mockito.mock(IamProvider.class);
		service.iamProvider = new IamProvider[] { provider };
		var configuration = Mockito.mock(IamConfiguration.class);
		Mockito.when(provider.getConfiguration()).thenReturn(configuration);
		var repository = Mockito.mock(IUserRepository.class);
		Mockito.when(configuration.getUserRepository()).thenReturn(repository);
		var userOrg = new UserOrg();
		userOrg.setName("federated");
		Mockito.when(repository.findByIdNoCache("jdoe")).thenReturn(userOrg);
		var details = Mockito.mock(UserDetails.class);
		Mockito.when(federated.loadUserByUsername("federated")).thenReturn(details);
		Assertions.assertSame(details, service.loadUserByUsername("jdoe"));
	}

	@Test
	public void loadUserByUsernameNotFederated() {
		final var service = new FederatedUserDetailsService();
		final var federated = Mockito.mock(RbacUserDetailsService.class);
		service.federated = federated;
		final var provider = Mockito.mock(IamProvider.class);
		service.iamProvider = new IamProvider[] { provider };
		var configuration = Mockito.mock(IamConfiguration.class);
		Mockito.when(provider.getConfiguration()).thenReturn(configuration);
		var repository = Mockito.mock(IUserRepository.class);
		Mockito.when(configuration.getUserRepository()).thenReturn(repository);
		var details = Mockito.mock(UserDetails.class);
		Mockito.when(federated.loadUserByUsername("jdoe")).thenReturn(details);
		Assertions.assertSame(details, service.loadUserByUsername("jdoe"));
	}

}
