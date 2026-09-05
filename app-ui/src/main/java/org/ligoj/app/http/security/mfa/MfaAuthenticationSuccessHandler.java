package org.ligoj.app.http.security.mfa;

import java.io.IOException;

import org.ligoj.app.http.security.RestRedirectStrategy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Success handler adding the second factor after any primary authentication (form login, OIDC): when the user
 * registered an MFA device, the session is flagged as pending and the user is sent to the MFA page instead of the
 * application; otherwise the delegate completes the login as usual.
 */
@Slf4j
@RequiredArgsConstructor
public class MfaAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

	private final AuthenticationSuccessHandler delegate;
	private final MfaClient client;

	/**
	 * When <code>true</code>, the login is an AJAX call (form login page): the redirection is written as the JSON
	 * payload the login page reads. Otherwise (OIDC), a real HTTP redirect.
	 */
	private final boolean restStyle;
	private final String usernameOAuth2Attribute;

	@Override
	public void onAuthenticationSuccess(final HttpServletRequest request, final HttpServletResponse response,
			final Authentication authentication) throws IOException, ServletException {
		final var user = MfaSupport.userName(authentication, usernameOAuth2Attribute);
		final var state = client.state(user);
		if (!state.required()) {
			delegate.onAuthenticationSuccess(request, response, authentication);
			return;
		}
		final var session = request.getSession(true);
		session.setAttribute(MfaSupport.ATTRIBUTE_PENDING, Boolean.TRUE);
		session.setAttribute(MfaSupport.ATTRIBUTE_DEVICES, state.devicesJson());
		session.removeAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS);
		log.info("Second factor required for {}", user);
		if (restStyle) {
			final var strategy = new RestRedirectStrategy();
			strategy.setSuccess(true);
			strategy.setForceRedirect(true);
			strategy.sendRedirect(request, response, MfaSupport.MFA_PAGE);
		} else {
			response.sendRedirect(response.encodeRedirectURL(request.getContextPath() + MfaSupport.MFA_PAGE));
		}
	}
}
