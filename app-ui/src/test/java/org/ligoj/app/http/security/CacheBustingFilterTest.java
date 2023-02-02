/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.DelegatingServletOutputStream;

/**
 * Test class of {@link CacheBustingFilter}
 */
class CacheBustingFilterTest {

	@Test
	void javax() throws ServletException {
		new CaptchaFilter().init(null);
		new CaptchaFilter().destroy();
	}

	@Test
	void test302() throws ServletException, IOException {
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(302);
		newFilter(response);
		Mockito.verify(response).setHeader("Pragma", "no-cache");
	}

	private void newFilter(final HttpServletResponse response) throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var filter = new CacheBustingFilter();
		final var filterConfig = Mockito.mock(FilterConfig.class);
		final var baos = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		Mockito.doReturn("1").when(filterConfig).getInitParameter("expiration");
		filter.init(filterConfig);
		filter.doFilter(request, response, Mockito.mock(FilterChain.class));
	}

	@Test
	void test204() throws ServletException, IOException {
		final var response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(response.getStatus()).thenReturn(204);
		newFilter(response);
		Mockito.verify(response, Mockito.never()).setHeader("Pragma", "no-cache");
	}

}