package org.ligoj.app.http.security.mfa;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/**
 * Test class of {@link MfaAuthorizationManager}.
 */
class MfaAuthorizationManagerTest {

	private MockHttpServletRequest request(final String path, final boolean pending) {
		final var request = new MockHttpServletRequest("GET", "/ligoj" + path);
		request.setContextPath("/ligoj");
		if (pending) {
			request.getSession(true).setAttribute(MfaSupport.ATTRIBUTE_PENDING, Boolean.TRUE);
		}
		return request;
	}

	@Test
	@SuppressWarnings("unchecked")
	void pendingDeniesTheApplication() {
		final AuthorizationManager<RequestAuthorizationContext> delegate = mock(AuthorizationManager.class);
		final var manager = new MfaAuthorizationManager(delegate);
		final var result = manager.authorize(() -> mock(Authentication.class), new RequestAuthorizationContext(request("/index.html", true)));
		Assertions.assertFalse(result.isGranted());
		Assertions.assertFalse(manager.authorize(() -> null, new RequestAuthorizationContext(request("/rest/session", true))).isGranted());
		verify(delegate, never()).authorize(any(), any());
	}

	@Test
	@SuppressWarnings("unchecked")
	void pendingAllowsTheMfaPagesAndAssets() {
		final AuthorizationManager<RequestAuthorizationContext> delegate = mock(AuthorizationManager.class);
		when(delegate.authorize(any(), any())).thenReturn(new AuthorizationDecision(true));
		final var manager = new MfaAuthorizationManager(delegate);
		for (final var path : new String[] { "/mfa.html", "/login/mfa", "/login/mfa/passkey", "/logout", "/logout.html", "/favicon.ico", "/assets/mfa.js", "/dist/x.css", "/404.html" }) {
			Assertions.assertTrue(manager.authorize(() -> null, new RequestAuthorizationContext(request(path, true))).isGranted(), path);
		}
	}

	@Test
	@SuppressWarnings("unchecked")
	void notPendingDelegates() {
		final AuthorizationManager<RequestAuthorizationContext> delegate = mock(AuthorizationManager.class);
		when(delegate.authorize(any(), any())).thenReturn(new AuthorizationDecision(false));
		final var manager = new MfaAuthorizationManager(delegate);
		Assertions.assertFalse(manager.authorize(() -> null, new RequestAuthorizationContext(request("/index.html", false))).isGranted());
		// No session at all
		final var request = new MockHttpServletRequest("GET", "/ligoj/index.html");
		request.setContextPath("/ligoj");
		Assertions.assertFalse(manager.authorize(() -> null, new RequestAuthorizationContext(request)).isGranted());
		verify(delegate, org.mockito.Mockito.times(2)).authorize(any(), any());
	}
}
