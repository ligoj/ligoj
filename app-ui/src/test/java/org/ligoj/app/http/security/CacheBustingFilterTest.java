/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.HttpHeaders;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.DelegatingServletOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Test class of {@link CacheBustingFilter}
 */
class CacheBustingFilterTest {

	@Test
	void test302() throws ServletException, IOException {
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(302);
		newFilter(response);
		Mockito.verify(response).setHeader(HttpHeaders.PRAGMA, "no-cache");
	}

	private void newFilter(final HttpServletResponse response) throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var filter = new CacheBustingFilter(1);
		final var out = new DelegatingServletOutputStream(new ByteArrayOutputStream());
		Mockito.when(response.getOutputStream()).thenReturn(out);
		filter.doFilter(request, response, Mockito.mock(FilterChain.class));
	}

	@Test
	void testIgnorePragmaResponseWrapper() {
		final var response = Mockito.mock(HttpServletResponse.class);
		final var wrapper = new CacheBustingFilter.IgnorePragmaResponseWrapper(response);
		wrapper.addHeader(HttpHeaders.EXPIRES, "Value1");
		wrapper.addHeader(HttpHeaders.PRAGMA, "Value2");
		wrapper.setHeader(HttpHeaders.EXPIRES, "Value1");
		wrapper.setHeader(HttpHeaders.PRAGMA, "Value2");
		Mockito.verify(response, Mockito.atLeastOnce()).setHeader(HttpHeaders.EXPIRES, "Value1");
		Mockito.verify(response, Mockito.never()).setHeader(HttpHeaders.PRAGMA, "Value2");
		Mockito.verify(response, Mockito.atLeastOnce()).addHeader(HttpHeaders.EXPIRES, "Value1");
		Mockito.verify(response, Mockito.never()).addHeader(HttpHeaders.PRAGMA, "Value2");
	}

	@Test
	void test204() throws ServletException, IOException {
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(204);
		newFilter(response);
		Mockito.verify(response, Mockito.never()).setHeader(HttpHeaders.PRAGMA, "no-cache");
	}

	@Test
	void test200Expiration() throws ServletException, IOException {
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(200);
		newFilter(response);
		Mockito.verify(response).setHeader(HttpHeaders.CACHE_CONTROL, "public, max-age=1");
	}

	@Test
	void test200NoExpiration() throws ServletException, IOException {
		// Zero expiration → cacheable but revalidated on each use (stable-URL
		// mutable resources such as the runtime plugin bundles).
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(200);
		final var request = Mockito.mock(HttpServletRequest.class);
		new CacheBustingFilter(0).doFilter(request, response, Mockito.mock(FilterChain.class));
		Mockito.verify(response).setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");
		Mockito.verify(response, Mockito.never()).setHeader(HttpHeaders.PRAGMA, "no-cache");
	}

	@Test
	void test200VersionedOnlyWithoutVersion() throws ServletException, IOException {
		// versionedOnly + unversioned request → revalidate on each use.
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(200);
		final var request = Mockito.mock(HttpServletRequest.class);
		new CacheBustingFilter(31556926, true).doFilter(request, response, Mockito.mock(FilterChain.class));
		Mockito.verify(response).setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");
	}

	@Test
	void test200VersionedOnlyWithVersion() throws ServletException, IOException {
		// versionedOnly + `?v=<token>` → the content at this URL never changes
		// (the token rotates instead), cache for a year as immutable.
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(200);
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.when(request.getParameter("v")).thenReturn("1B2M2Y8AsgTpgAmY7PhCfg==");
		new CacheBustingFilter(31556926, true).doFilter(request, response, Mockito.mock(FilterChain.class));
		Mockito.verify(response).setHeader(HttpHeaders.CACHE_CONTROL, "public, max-age=31556926, immutable");
	}
}