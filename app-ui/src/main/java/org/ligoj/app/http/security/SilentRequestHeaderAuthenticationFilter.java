/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedCredentialsNotFoundException;
import org.springframework.security.web.authentication.preauth.RequestHeaderAuthenticationFilter;

import java.io.IOException;
import java.util.regex.Pattern;

/**
 * Security filter enabled when a required header is used for pre-authentication.
 */
public class SilentRequestHeaderAuthenticationFilter extends RequestHeaderAuthenticationFilter {

	/**
	 * Static pages
	 */
	public static final Pattern WHITE_LIST_PAGES = Pattern.compile("/(\\d{3}|logout|login)(-prod)?\\.html(\\?.*)?");
	/**
	 * Static assets
	 */
	public static final Pattern WHITE_LIST_ASSETS = Pattern.compile("/(favicon.ico|logout|(themes|lib|dist|main/public)/.*)");
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

	private boolean isAuthDatPresent(final HttpServletRequest req, final String name) {
		return StringUtils.isNotBlank(req.getParameter(name)) || StringUtils.isNotBlank(req.getHeader("x-" + name));
	}

	private boolean isAllowed(HttpServletRequest req) {
		return WHITE_LIST_PAGES.matcher(req.getServletPath()).matches() ||
				WHITE_LIST_ASSETS.matcher(req.getServletPath()).matches() || (req.getServletPath().startsWith("/rest")
				&& isAuthDatPresent(req, "api-key")
				&& isAuthDatPresent(req, "api-user"));
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
		final var req = (HttpServletRequest) request;
		final var res = (HttpServletResponse) response;
		if (isAllowed(req)) {
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
				res.sendRedirect(Strings.CS.appendIfMissing(req.getContextPath(), "/"));
			} else {
				super.doFilter(request, response, chain);
			}
		}
	}

}
