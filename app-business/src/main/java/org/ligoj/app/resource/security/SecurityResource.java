package org.ligoj.app.resource.security;

import javax.transaction.Transactional;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

import org.ligoj.app.iam.IAuthenticationContributor;
import org.ligoj.app.iam.IamProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Session resource.
 */
@Path("/security")
@Service
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class SecurityResource {

	@Autowired
	protected ApplicationContext applicationContext;

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
		final Authentication authentication = authenticate(user.getName(), user.getPassword());

		// Delegate the final response to the authentication contributors
		final ResponseBuilder response = Response.noContent();
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
