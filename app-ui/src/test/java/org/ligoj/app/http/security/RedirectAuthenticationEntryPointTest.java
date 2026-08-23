/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.web.RedirectStrategy;

import java.io.IOException;
import java.util.Set;

import static org.mockito.Mockito.*;

/**
 * Test {@link RedirectAuthenticationEntryPoint} implementation.
 */
class RedirectAuthenticationEntryPointTest {

	private RedirectAuthenticationEntryPoint entryPoint;

	@BeforeEach
	void setup() {
		entryPoint = new RedirectAuthenticationEntryPoint("http://h");
		entryPoint.setRedirectUrls(Set.of("/index.html"));
	}

	@Test
	void redirectByContentNoForce() throws IOException, ServletException {
		final var request = mock(HttpServletRequest.class);
		when(request.getServletPath()).thenReturn("/something-else");
		final var strategy = mock(RedirectStrategy.class);
		entryPoint.setRedirectStrategy(strategy);
		entryPoint.commence(request, null, null);
		verify(strategy, atLeastOnce()).sendRedirect(request, null, "");
	}

	@Test
	void redirectByContentForceHtml() throws IOException, ServletException {
		final var request = mock(HttpServletRequest.class);
		when(request.getServletPath()).thenReturn("/page.html");
		final var strategy = mock(RedirectStrategy.class);
		entryPoint.setRedirectStrategy(strategy);
		entryPoint.commence(request, null, null);
		verify(strategy, atLeastOnce()).sendRedirect(request, null, "");

		// With `forceRedirectUrl`, the configured loginFormUrl is now
		// forwarded to the strategy (was previously hardcoded to null).
		// The SPA needs it to detect OIDC mode from the x-redirect header.
		entryPoint.setForceRedirectUrl(true);
		entryPoint.commence(request, null, null);
		verify(strategy, atLeastOnce()).sendRedirect(request, null, "http://h");
	}

	@Test
	void standardRedirect() throws IOException, ServletException {
		final var request = mock(HttpServletRequest.class);
		when(request.getServletPath()).thenReturn("/index.html");
		final var response = mock(HttpServletResponse.class);
		when(response.encodeRedirectURL("http://h")).thenReturn("encoded");
		entryPoint.setForceRedirectUrl(true);
		entryPoint.commence(request, response, null);
		verify(response, atLeastOnce()).sendRedirect("encoded");
	}
}
