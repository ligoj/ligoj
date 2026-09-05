package org.ligoj.app.http.security.mfa;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import jakarta.servlet.http.HttpServletRequest;
import lombok.experimental.UtilityClass;

/**
 * Multi-factor authentication support: the session state set by the primary authentication and cleared by the
 * verification, and the shared helpers.
 */
@UtilityClass
public class MfaSupport {

	/**
	 * Session attribute set to {@link Boolean#TRUE} while the second factor is pending.
	 */
	public static final String ATTRIBUTE_PENDING = "ligoj.mfa.pending";

	/**
	 * Session attribute counting the failed verifications.
	 */
	public static final String ATTRIBUTE_ATTEMPTS = "ligoj.mfa.attempts";

	/**
	 * Session attribute holding the JSON array of the user's devices (id, name, type, default), for the MFA page.
	 */
	public static final String ATTRIBUTE_DEVICES = "ligoj.mfa.devices";

	/**
	 * The page asking for the code.
	 */
	public static final String MFA_PAGE = "/mfa.html";

	/**
	 * The verification endpoint of the front-end.
	 */
	public static final String VERIFY_PATH = "/login/mfa";

	/**
	 * The passkey challenge endpoint of the front-end (GET): the request options for the browser.
	 */
	public static final String PASSKEY_PATH = "/login/mfa/passkey";

	/**
	 * Whether the second factor is pending for this session.
	 *
	 * @param request The current request.
	 * @return <code>true</code> when the user is authenticated but not yet verified.
	 */
	public static boolean isPending(final HttpServletRequest request) {
		final var session = request.getSession(false);
		return session != null && Boolean.TRUE.equals(session.getAttribute(ATTRIBUTE_PENDING));
	}

	/**
	 * User name to send to the API: the OIDC attribute when relevant, otherwise the authentication name.
	 *
	 * @param authentication          The authentication.
	 * @param usernameOAuth2Attribute The OIDC attribute holding the user name.
	 * @return The user name.
	 */
	public static String userName(final Authentication authentication, final String usernameOAuth2Attribute) {
		if (authentication instanceof OAuth2AuthenticationToken token && StringUtils.isNotBlank(usernameOAuth2Attribute)) {
			final Object attribute = token.getPrincipal().getAttribute(usernameOAuth2Attribute);
			if (attribute != null) {
				return attribute.toString();
			}
		}
		return authentication.getName();
	}

	/**
	 * Request path without the context path.
	 *
	 * @param request The request.
	 * @return The path, starting with <code>/</code>.
	 */
	public static String path(final HttpServletRequest request) {
		return Strings.CS.removeStart(request.getRequestURI(), request.getContextPath());
	}
}
