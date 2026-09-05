package org.ligoj.app.http.security.mfa;

import java.io.IOException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Access denied handler sending a session with a pending second factor to the MFA page; other denials go to the
 * regular error page.
 */
public class MfaAccessDeniedHandler implements AccessDeniedHandler {

	private final AccessDeniedHandler delegate;

	/**
	 * @param errorPage The regular error page, such as <code>/login.html?denied</code>.
	 */
	public MfaAccessDeniedHandler(final String errorPage) {
		final var impl = new AccessDeniedHandlerImpl();
		impl.setErrorPage(errorPage);
		this.delegate = impl;
	}

	@Override
	public void handle(final HttpServletRequest request, final HttpServletResponse response,
			final AccessDeniedException accessDeniedException) throws IOException, ServletException {
		if (MfaSupport.isPending(request)) {
			response.sendRedirect(response.encodeRedirectURL(request.getContextPath() + MfaSupport.MFA_PAGE));
		} else {
			delegate.handle(request, response, accessDeniedException);
		}
	}
}
