/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;
import java.util.regex.Pattern;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringUtils;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedCredentialsNotFoundException;
import org.springframework.security.web.authentication.preauth.RequestHeaderAuthenticationFilter;

/**
 * Security filter enabled when a required header is used for pre-authentication.
 */
public class SilentRequestHeaderAuthenticationFilter extends RequestHeaderAuthenticationFilter {

	/**
	 * Common whitelist pattern.
	 */
	public static final Pattern WHITE_LIST_PATTERN = Pattern.compile("/((\\d{3}|logout|login)(-prod)?\\.html(\\?.*)?|favicon.ico|logout|(themes|lib|dist|main/public)/.*)");
	/**
	 * Only there because of visibility of "principalRequestHeader" of {@link RequestHeaderAuthenticationFilter}
	 */
	private String principalHeaderCopy;

	/**
	 * Simple constructor using a forward to "401" page on error.
	 */
	public SilentRequestHeaderAuthenticationFilter() {
		final var handler = new SimpleUrlAuthenticationFailureHandler();
		handler.setUseForward(true);
		setAuthenticationFailureHandler(handler);
		setExceptionIfHeaderMissing(false);
		setCheckForPrincipalChanges(false);
		setContinueFilterChainOnUnsuccessfulAuthentication(false);
	}

	@Override
	public void setPrincipalRequestHeader(String principalRequestHeader) {
		// Only there because of visibility of "principalRequestHeader"
		super.setPrincipalRequestHeader(principalRequestHeader);
		this.principalHeaderCopy = principalRequestHeader;
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
		final var req = (HttpServletRequest) request;
		final var res = (HttpServletResponse) response;
		if (WHITE_LIST_PATTERN.matcher(req.getServletPath()).matches() || (req.getServletPath().startsWith("/rest")
				&& (StringUtils.isNotBlank(req.getParameter("api-key")) || StringUtils.isNotBlank(req.getHeader("x-api-key")))
				&& (StringUtils.isNotBlank(req.getParameter("api-user")) || StringUtils.isNotBlank(req.getHeader("x-api-user"))))) {
			// White-list error page and keyed API access
			chain.doFilter(request, response);
		} else {
			final var principal = (String) getPreAuthenticatedPrincipal(req);
			if (principal == null || getPreAuthenticatedCredentials(req) == null) {
				// We want this header
				unsuccessfulAuthentication(req, res,
						new PreAuthenticatedCredentialsNotFoundException(principalHeaderCopy + " header not found in request."));
			} else if (req.getRequestURI().matches(req.getContextPath() + "/?login.html")) {
				// In pre-auth mode, "/login" page is not available
				res.sendRedirect(StringUtils.appendIfMissing(req.getContextPath(), "/"));
			} else {
				super.doFilter(request, response, chain);
			}
		}
	}

}
