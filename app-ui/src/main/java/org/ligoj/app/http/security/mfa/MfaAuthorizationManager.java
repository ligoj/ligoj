package org.ligoj.app.http.security.mfa;

import java.util.function.Supplier;
import java.util.regex.Pattern;

import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import lombok.RequiredArgsConstructor;

/**
 * Authorization gate of the second factor: while it is pending, only the MFA page, its verification endpoint, the
 * logout and the static assets are reachable. Everything else is delegated to the regular authorization.
 */
@RequiredArgsConstructor
public class MfaAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

	/**
	 * Paths reachable while the second factor is pending.
	 */
	static final Pattern ALLOWED = Pattern
			.compile("/(mfa\\.html|login/mfa(/passkey)?|logout(\\.html)?|favicon\\.ico|\\d{3}\\.html|(themes|lib|dist|main/public|assets)/.*)");

	private final AuthorizationManager<RequestAuthorizationContext> delegate;

	@Override
	public AuthorizationResult authorize(final Supplier<? extends Authentication> authentication,
			final RequestAuthorizationContext context) {
		final var request = context.getRequest();
		if (MfaSupport.isPending(request) && !ALLOWED.matcher(MfaSupport.path(request)).matches()) {
			return new AuthorizationDecision(false);
		}
		return delegate.authorize(authentication, context);
	}
}
