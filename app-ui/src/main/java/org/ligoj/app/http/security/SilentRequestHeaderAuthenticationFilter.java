/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringUtils;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedCredentialsNotFoundException;
import org.springframework.security.web.authentication.preauth.RequestHeaderAuthenticationFilter;

/**
 * Security filter enabled when a required header is used for pre-authentication.
 */
public class SilentRequestHeaderAuthenticationFilter extends RequestHeaderAuthenticationFilter {

	/**
	 * Only there because of visibility of "principalRequestHeader" of {@link RequestHeaderAuthenticationFilter}
	 */
	private String principalHeaderCopy;

	/**
	 * Simple constructor using a forward to "401" page on error.
	 */
	public SilentRequestHeaderAuthenticationFilter() {
		final SimpleUrlAuthenticationFailureHandler handler = new SimpleUrlAuthenticationFailureHandler();
		handler.setDefaultFailureUrl("/401.html");
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
		final HttpServletRequest req = (HttpServletRequest) request;
		final HttpServletResponse res = (HttpServletResponse) response;
		if (req.getRequestURI().matches(".*/([0-9]{3}\\.html|favicon.ico|themes/.*)")) {
			// White-list error page
			chain.doFilter(request, response);
		} else {
			final String principal = (String) getPreAuthenticatedPrincipal(req);
			if (principal == null || getPreAuthenticatedCredentials(req) == null) {
				// We want this header
				unsuccessfulAuthentication(req, res,
						new PreAuthenticatedCredentialsNotFoundException(principalHeaderCopy + " header not found in request."));
			} else if (req.getRequestURI().matches(req.getContextPath() + "/?login.html")) {
				// In pre-auth mode, "/login" page is not available
				res.sendRedirect(StringUtils.appendIfMissing(req.getContextPath(),"/"));
			} else {
				super.doFilter(request, response, chain);
			}
		}
	}

}
