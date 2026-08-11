/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;

import java.io.IOException;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link SilentRequestHeaderAuthenticationFilter}
 */
class SilentRequestHeaderAuthenticationFilterTest {

	@Test
	void doFilterWhitelist() throws IOException, ServletException {
		final var filter = newFilter();
		final var request = mock(HttpServletRequest.class);
		doReturn("/path/500.html").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("/500.html").when(request).getServletPath();
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterRestNoPrincipal() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = mock(HttpServletRequest.class);
		doReturn("/context/rest/service").when(request).getRequestURI();
		doReturn("/rest/service").when(request).getServletPath();
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterRestApiKeyNoUser() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = mock(HttpServletRequest.class);
		final var dis = mock(RequestDispatcher.class);
		doReturn("/context/rest/service").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("SOME_API_KEY").when(request).getParameter("api-key");
		doReturn("/rest/service").when(request).getServletPath();
		doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterRestApiKey2NoUser() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = mock(HttpServletRequest.class);
		final var dis = mock(RequestDispatcher.class);
		doReturn("/context/rest/service").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("SOME_API_KEY").when(request).getHeader("x-api-key");
		doReturn("SOME_API_USER").when(request).getHeader("x-api-user");
		doReturn("/rest/service").when(request).getServletPath();
		doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterRestApiKey2NoUser2() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = mock(HttpServletRequest.class);
		final var dis = mock(RequestDispatcher.class);
		doReturn("/context/rest/service").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("SOME_API_KEY").when(request).getHeader("x-api-key");
		doReturn("SOME_API_USER").when(request).getParameter("api-user");
		doReturn("/rest/service").when(request).getServletPath();
		doReturn(dis).when(request).getRequestDispatcher("/401.html");
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterNoPrincipal() throws IOException, ServletException {
		final var filter = new SilentRequestHeaderAuthenticationFilter();
		final var request = mock(HttpServletRequest.class);
		doReturn("/path/to").when(request).getRequestURI();
		doReturn("/").when(request).getServletPath();
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilterNoCredentials() throws IOException, ServletException {
		final var filter = newFilter();
		final var request = mock(HttpServletRequest.class);
		doReturn("/path/to").when(request).getRequestURI();
		doReturn("/").when(request).getServletPath();
		doReturn("PRINCIPAL").when(request).getHeader("MY_HEADER_P");
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(response).sendError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase());
	}

	@Test
	void doFilter() throws IOException, ServletException {
		final var request = mock(HttpServletRequest.class);
		final var dis = mock(RequestDispatcher.class);
		final var filter = newFilter();
		doReturn("/path/to/rest").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("/").when(request).getContextPath();
		doReturn("/").when(request).getServletPath();
		doReturn(dis).when(request).getRequestDispatcher("/401.html");
		addHeaders(request);
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(chain).doFilter(request, response);
	}

	@Test
	void doFilterLogin() throws IOException, ServletException {
		final var request = mock(HttpServletRequest.class);
		final var dis = mock(RequestDispatcher.class);
		final var filter = newFilter();
		doReturn("/context/login.html").when(request).getRequestURI();
		doReturn(DispatcherType.REQUEST).when(request).getDispatcherType();
		doReturn("/context").when(request).getContextPath();
		doReturn("/").when(request).getServletPath();
		doReturn(dis).when(request).getRequestDispatcher("/401.html");
		addHeaders(request);
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		filter.doFilter(request, response, chain);
		verify(response).sendRedirect("/context/");
	}

	private SilentRequestHeaderAuthenticationFilter newFilter() {
		final var authenticationManager = mock(AuthenticationManager.class);
		final var filter = new SilentRequestHeaderAuthenticationFilter(SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PAGES_LOGIN) {
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
		doReturn("PRINCIPAL").when(request).getHeader("MY_HEADER_P");
		doReturn("CREDENTIALS").when(request).getHeader("MY_HEADER_C");
	}
}
