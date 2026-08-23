/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Setter;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;

import java.io.IOException;
import java.util.Set;

/**
 * Allow to choose a redirection strategy depending on the current request.
 */
@Setter
public class RedirectAuthenticationEntryPoint extends LoginUrlAuthenticationEntryPoint {

	/**
	 * JSON redirection strategy, used when the pattern "redirectJson" matches to the current request.
	 */
	private RedirectStrategy redirectStrategy;

	/**
	 * Servlet URLs to redirect.
	 */
	private Set<String> redirectUrls;

	/**
	 * Force redirect URL
	 */
	private boolean forceRedirectUrl = false;

	/**
	 * Build the redirect to a specific entry point.
	 *
	 * @param loginFormUrl URL where the login page can be found. Should either be relative to the web-app context path
	 *                     (include a leading {@code /}) or an absolute URL.
	 */
	public RedirectAuthenticationEntryPoint(final String loginFormUrl) {
		super(loginFormUrl);
	}

	/**
	 * Performs the redirect (or forward) to the login form URL.
	 */
	@Override
	public void commence(final HttpServletRequest request, final HttpServletResponse response,
			final AuthenticationException authException) throws IOException, ServletException {

		// Choose the right redirection
		if (redirectUrls.contains(request.getServletPath())) {
			// Standard redirection
			super.commence(request, response, authException);
		} else {
			// REST-style redirect: emit a 401 + x-redirect header so an
			// XHR caller (the SPA) knows where to send the browser next.
			// When `forceRedirectUrl` is set (typical for OIDC), include
			// the configured loginFormUrl in the redirect — without it
			// the SPA can't distinguish "session expired, show local
			// form" from "OIDC mode, navigate to /oauth2/authorization/...".
			redirectStrategy.sendRedirect(request, response,
					forceRedirectUrl ? getLoginFormUrl() : "");
		}
	}
}
