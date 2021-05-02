/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.security;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.ligoj.app.iam.IAuthenticationContributor;
import org.ligoj.app.iam.IamProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Session resource.
 */
@Path("/security")
@Service
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class SecurityResource {

	/**
	 * Federated user details service
	 */
	@Autowired
	protected ApplicationContext applicationContext;

	/**
	 * Resolved IAM providers
	 */
	@Autowired
	protected IamProvider[] iamProvider;

	/**
	 * Check the user credentials.
	 * 
	 * @param user
	 *            the user 's credentials.
	 * @return the custom {@link Response} that may contain additional cross-domain cookies.
	 */
	@POST
	@Path("login")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response login(final User user) {
		// The authenticate the user
		final var authentication = authenticate(user.getName(), user.getPassword());

		// Delegate the final response to the authentication contributors
		final var response = Response.noContent();
		applicationContext.getBeansOfType(IAuthenticationContributor.class).values().forEach(l -> l.accept(response, authentication));
		return response.build();
	}

	/**
	 * Authenticate the given user
	 */
	private Authentication authenticate(final String name, final String credential) {
		return iamProvider[0].authenticate(new UsernamePasswordAuthenticationToken(name, credential));
	}

}
