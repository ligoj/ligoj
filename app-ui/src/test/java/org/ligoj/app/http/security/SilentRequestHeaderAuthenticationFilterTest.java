/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;

/**
 * Test class of {@link SilentRequestHeaderAuthenticationFilter}
 */
class SilentRequestHeaderAuthenticationFilterTest {

	@Test
	void doFilterWhitelist() throws IOException, ServletException {
		final var filter = newFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.doReturn("/path/500.html").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("/500.html").when(request).getServletPath();
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterRestNoPrincipal() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.doReturn("/context/rest/service").when(request).getRequestURI();
		Mockito.doReturn("/rest/service").when(request).getServletPath();
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterRestApiKeyNoUser() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		final var dis = Mockito.mock(RequestDispatcher.class);
		Mockito.doReturn("/context/rest/service").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("SOME_API_KEY").when(request).getParameter("api-key");
		Mockito.doReturn("/rest/service").when(request).getServletPath();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterRestApiKey2NoUser() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		final var dis = Mockito.mock(RequestDispatcher.class);
		Mockito.doReturn("/context/rest/service").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("SOME_API_KEY").when(request).getHeader("x-api-key");
		Mockito.doReturn("SOME_API_USER").when(request).getHeader("x-api-user");
		Mockito.doReturn("/rest/service").when(request).getServletPath();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterRestApiKey2NoUser2() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		final var dis = Mockito.mock(RequestDispatcher.class);
		Mockito.doReturn("/context/rest/service").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("SOME_API_KEY").when(request).getHeader("x-api-key");
		Mockito.doReturn("SOME_API_USER").when(request).getParameter("api-user");
		Mockito.doReturn("/rest/service").when(request).getServletPath();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterNoPrincipal() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.doReturn("/path/to").when(request).getRequestURI();
		Mockito.doReturn("/").when(request).getServletPath();
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterNoCredentials() throws IOException, ServletException {
		final var filter = newFilter();
		final var request = Mockito.mock(HttpServletRequest.class);
		Mockito.doReturn("/path/to").when(request).getRequestURI();
		Mockito.doReturn("/").when(request).getServletPath();
		Mockito.doReturn("PRINCIPAL").when(request).getHeader("MY_HEADER_P");
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilter() throws IOException, ServletException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var dis = Mockito.mock(RequestDispatcher.class);
		final var filter = newFilter();
		Mockito.doReturn("/path/to/rest").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("/").when(request).getContextPath();
		Mockito.doReturn("/").when(request).getServletPath();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		addHeaders(request);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
	}

	@Test
	void doFilterLogin() throws IOException, ServletException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var dis = Mockito.mock(RequestDispatcher.class);
		final var filter = newFilter();
		Mockito.doReturn("/context/login.html").when(request).getRequestURI();
		Mockito.doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		Mockito.doReturn("/context").when(request).getContextPath();
		Mockito.doReturn("/").when(request).getServletPath();
		Mockito.doReturn(dis).when(request).getRequestDispatcher("/401.html");
		addHeaders(request);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		Mockito.verify(response).sendRedirect("/context/");
	}

	private SilentRequestHeaderAuthenticationFilter newFilter() {
		final var authenticationManager = Mockito.mock(AuthenticationManager.class);
		final var filter = new SilentRequestHeaderAuthenticationFilter() {
			@Override
			protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, Authentication authResult) {
				// Nothing to do
			}
		};
		filter.setPrincipalRequestHeader("MY_HEADER_P");
		filter.setCredentialsRequestHeader("MY_HEADER_C");
		filter.setAuthenticationManager(authenticationManager);
		return filter;
	}

	private void addHeaders(final HttpServletRequest request) {
		Mockito.doReturn("PRINCIPAL").when(request).getHeader("MY_HEADER_P");
		Mockito.doReturn("CREDS").when(request).getHeader("MY_HEADER_C");
	}
}
