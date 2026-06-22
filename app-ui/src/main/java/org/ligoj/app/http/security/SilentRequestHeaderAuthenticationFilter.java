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
	 * Static pages whitelisted in {@code Rest} security mode — anything an
	 * unauthenticated user must reach to finish a local-form login flow
	 * (login form itself, recovery/reset variants land on the same page).
	 */
	public static final Pattern WHITE_LIST_PAGES_LOGIN = Pattern.compile("/(\\d{3}|logout|login)\\.html(\\?.*)?");

	/**
	 * Static pages whitelisted in {@code OAuth2Bff} / pre-auth modes.
	 *
	 * {@code /login.html} is included here too even though OAuth/SSO drives
	 * the actual authentication — the SPA still uses this page as the
	 * landing pad for failure / logout / concurrency / expiry feedback (the
	 * {@code failureUrl} of {@code oauth2Login} points at
	 * {@code /login.html?denied}, and similar query-flag routings exist for
	 * other one-shot statuses). Excluding {@code login} here lets Spring's
	 * authentication entry point intercept those requests and 302 them
	 * straight back into {@code /oauth2/authorization/<client>}, producing
	 * an infinite redirect loop with the IdP whenever an OAuth round-trip
	 * fails. The SPA's own {@code LoginApp.vue} bouncer takes care of
	 * sending users from a plain {@code /login.html} GET back to the
	 * SPA-root → IdP path in OAuth modes, so whitelisting is safe.
	 */
	public static final Pattern WHITE_LIST_PAGES = Pattern.compile("/(\\d{3}|logout|login)\\.html(\\?.*)?");

	/**
	 * Static assets
	 */
	public static final Pattern WHITE_LIST_ASSETS = Pattern.compile("/(favicon.ico|logout|(themes|lib|dist|main/public|assets)/.*)");
	/**
	 * Only there because of visibility of "principalRequestHeader" of {@link RequestHeaderAuthenticationFilter}
	 */
	private String principalHeaderCopy;

	private final Pattern whiteListPages;

	/**
	 * Simple constructor using a forward to "401" page on error. Default white list pages are login pages.
	 */
	public SilentRequestHeaderAuthenticationFilter() {
		this(WHITE_LIST_PAGES_LOGIN);
	}

	/**
	 * Simple constructor using a forward to "401" page on error.
	 *
	 * @param whiteListPages Pattern of pages to exclude from this filter.
	 */
	public SilentRequestHeaderAuthenticationFilter(Pattern whiteListPages) {
		final var handler = new SimpleUrlAuthenticationFailureHandler();
		handler.setUseForward(true);
		setAuthenticationFailureHandler(handler);
		setExceptionIfHeaderMissing(false);
		setCheckForPrincipalChanges(false);
		setContinueFilterChainOnUnsuccessfulAuthentication(false);
		this.whiteListPages = whiteListPages;
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
		return whiteListPages.matcher(req.getServletPath()).matches() || WHITE_LIST_ASSETS.matcher(req.getServletPath()).matches()
				|| (req.getServletPath().startsWith("/rest") && isAuthDatPresent(req, "api-key") && isAuthDatPresent(req, "api-user"));
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
				unsuccessfulAuthentication(req, res, new PreAuthenticatedCredentialsNotFoundException(principalHeaderCopy + " header not found in request."));
			} else if (req.getRequestURI().matches(req.getContextPath() + "/?login.html")) {
				// In pre-auth mode, "/login" page is not available
				res.sendRedirect(Strings.CS.appendIfMissing(req.getContextPath(), "/"));
			} else {
				super.doFilter(request, response, chain);
			}
		}
	}

}
