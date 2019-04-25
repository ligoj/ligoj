/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.ligoj.app.http.security.SilentRequestHeaderAuthenticationFilter;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;

/**
 * Test class of {@link SilentRequestHeaderAuthenticationFilter}
 */
public class SilentRequestHeaderAuthenticationFilterTest {

	@Test
	public void doFilterWhitelist() throws IOException, ServletException {
		final Filter filter = new SilentRequestHeaderAuthenticationFilter();
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		Mockito.doReturn("/path/to/500.html").when(request).getRequestURI();
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final FilterChain chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(chain).doFilter(request, response);
	}

	@Test
	public void doFilterNoPrincipal() throws IOException, ServletException {
		final Filter filter = new SilentRequestHeaderAuthenticationFilter();
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final RequestDispatcher dis = Mockito.mock(RequestDispatcher.class);
		Mockito.doReturn("/path/to/rest").when(request).getRequestURI();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final FilterChain chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(dis).forward(request, response);
	}

	@Test
	public void doFilter() throws IOException, ServletException {
		final AuthenticationManager authenticationManager = Mockito.mock(AuthenticationManager.class);
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final RequestDispatcher dis = Mockito.mock(RequestDispatcher.class);
		final SilentRequestHeaderAuthenticationFilter filter = new SilentRequestHeaderAuthenticationFilter() {
			@Override
			protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, Authentication authResult) {
				// Nothing to do
			}
		};
		filter.setCredentialsRequestHeader("MY_HEADER_P");
		filter.setPrincipalRequestHeader("MY_HEADER_C");
		filter.setAuthenticationManager(authenticationManager);
		Mockito.doReturn("/path/to/rest").when(request).getRequestURI();
		Mockito.doReturn("PRINCIPAL").when(request).getHeader("MY_HEADER_P");
		Mockito.doReturn("CREDS").when(request).getHeader("MY_HEADER_C");
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final FilterChain chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
	}
}
