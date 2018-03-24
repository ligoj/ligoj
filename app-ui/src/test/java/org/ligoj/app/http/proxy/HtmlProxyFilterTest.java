/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.proxy;

import java.io.IOException;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * HTML proxying test of {@link HtmlProxyFilter} class ..
 */
public class HtmlProxyFilterTest {

	/**
	 * Test forward without locale.
	 */
	@Test
	public void testUseCaseForwardNoLocale() throws IOException, ServletException {
		checkForwardTo("/index.html", "/index.html", "");
	}

	/**
	 * Test forward from root URL.
	 */
	@Test
	public void testUseCaseForwardRoot() throws IOException, ServletException {
		checkForwardTo("/", "/index.html", "");
	}

	/**
	 * Test forward from not index/login URL.
	 */
	@Test
	public void testUseCaseForwardNotRoot() throws IOException, ServletException {
		checkForwardTo("/any.html", "/any.html", "");
	}

	/**
	 * Test forward from login URL.
	 */
	@Test
	public void testUseCaseForwardLogin() throws IOException, ServletException {
		checkForwardTo("/login.html", "/login.html", "");
	}

	/**
	 * Test forward from root, without context URL.
	 */
	@Test
	public void testUseCaseForwardRoot2() throws IOException, ServletException {
		checkForwardTo("", "/index.html", "");
	}

	/**
	 * Test use case forward.
	 */
	private void checkForwardTo(final String from, final String to, final String suffix) throws IOException, ServletException {
		final HtmlProxyFilter htmlProxyFilter = new HtmlProxyFilter();
		htmlProxyFilter.setSuffix(suffix);

		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		Mockito.when(request.getServletPath()).thenReturn(from);
		final RequestDispatcher requestDispatcher = Mockito.mock(RequestDispatcher.class);
		Mockito.when(request.getRequestDispatcher(to)).thenReturn(requestDispatcher);
		htmlProxyFilter.doFilter(request, response, null);
		Mockito.verify(requestDispatcher, Mockito.atLeastOnce()).forward(request, response);
		Mockito.validateMockitoUsage();
	}

}