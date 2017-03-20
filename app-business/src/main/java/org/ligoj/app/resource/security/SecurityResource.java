package org.ligoj.app.resource.security;

import javax.transaction.Transactional;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.ldap.resource.RedirectResource;
import org.ligoj.app.resource.session.User;

/**
 * Session resource.
 */
@Path("/security")
@Service
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class SecurityResource {

	private RedirectResource redirectResource;

	private IamProvider iamProvider;

	/**
	 * Constructor for test injection
	 * 
	 * @param iamProvider
	 *            The related {@link IamProvider}.
	 * @param redirectResource
	 *            The redirection support.
	 */
	@Autowired
	public SecurityResource(final IamProvider iamProvider, final RedirectResource redirectResource) {
		this.iamProvider = iamProvider;
		this.redirectResource = redirectResource;
	}

	/**
	 * Check the user credentials.
	 * 
	 * @param user
	 *            the user 's credentials.
	 * @return the custom {@link Response} that may contain additional cross-domain cookies.
	 * @throws Exception
	 *             For technical exception.
	 * @throws BadCredentialsException
	 *             when login failed.
	 */
	@POST
	@Path("login")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response login(final User user) throws Exception {
		// The authenticate the user
		final Authentication authentication = authenticate(user.getName(), user.getPassword());

		// Also return the redirect cookie preference
		return redirectResource.buildCookieResponse(user.getName()).header("X-Real-User", authentication.getName()).build();
	}

	/**
	 * Authenticate the given user
	 */
	private Authentication authenticate(final String name, final String credential) throws Exception {
		return iamProvider.authenticate(new UsernamePasswordAuthenticationToken(name, credential));
	}

}
