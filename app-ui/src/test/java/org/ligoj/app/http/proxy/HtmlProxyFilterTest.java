/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.proxy;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.eclipse.jetty.client.Request;
import org.eclipse.jetty.client.Response;
import org.eclipse.jetty.http.HttpField;
import org.eclipse.jetty.http.HttpFields;
import org.eclipse.jetty.http.HttpHeader;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.DelegatingServletOutputStream;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;

import static org.mockito.Mockito.*;

/**
 * HTML proxying test of {@link HtmlProxyFilter} class.
 */
class HtmlProxyFilterTest {

	/**
	 * Test forward without locale.
	 */
	@Test
	void testUseCaseForwardNoLocale() throws IOException, ServletException {
		checkForwardTo("/index.html", "/index.html", "");
	}

	/**
	 * Test forward from root URL.
	 */
	@Test
	void testUseCaseForwardRoot() throws IOException, ServletException {
		checkForwardTo("/", "/index.html", "");
	}

	/**
	 * Test forward from not index/login URL.
	 */
	@Test
	void testUseCaseForwardNotRoot() throws IOException, ServletException {
		checkForwardTo("/any.html", "/any.html", "");
	}

	/**
	 * Test forward from login URL.
	 */
	@Test
	void testUseCaseForwardLogin() throws IOException, ServletException {
		checkForwardTo("/login.html", "/login.html", "");
	}

	/**
	 * Test forward from root, without context URL.
	 */
	@Test
	void testUseCaseForwardRoot2() throws IOException, ServletException {
		checkForwardTo("", "/index.html", "");
	}

	/**
	 * Test use case forward.
	 */
	private void checkForwardTo(final String from, final String to, final String suffix) throws IOException, ServletException {
		final HtmlProxyFilter htmlProxyFilter = new HtmlProxyFilter();
		htmlProxyFilter.setSuffix(suffix);

		final HttpServletRequest request = mock(HttpServletRequest.class);
		final HttpServletResponse response = mock(HttpServletResponse.class);
		when(request.getServletPath()).thenReturn(from);
		final RequestDispatcher requestDispatcher = mock(RequestDispatcher.class);
		when(request.getRequestDispatcher(to)).thenReturn(requestDispatcher);
		when(request.getDispatcherType()).thenReturn(DispatcherType.REQUEST);
		htmlProxyFilter.doFilter(request, response, null);
		verify(requestDispatcher, atLeastOnce()).forward(request, response);
		validateMockitoUsage();
	}

	/**
	 * Test class of {@link BackendProxyServlet}
	 */
	static class BackendProxyServletTest {

		private static final String MAX_THREADS = "10";

		private BackendProxyServlet servlet;

		private ServletContext servletContext;

		@BeforeEach
		void setup() throws IllegalAccessException {
			servletContext = mock(ServletContext.class);
			servlet = new BackendProxyServlet() {
				/**
				 *
				 */
				private static final long serialVersionUID = 1L;

				{
					_log = LoggerFactory.getLogger("junit");
				}

				@Override
				public ServletContext getServletContext() {
					return servletContext;
				}
			};

			FieldUtils.writeField(servlet, "_log", mock(Logger.class), true);
		}

		@Test
		void init() throws ServletException {
			setupRedirection("/", "/");
		}

		@Test
		void initNoEndpoint() {
			Assertions.assertThrows(UnavailableException.class, () -> setupRedirection("/", ""));
		}

		@Test
		void rewriteURINotMatch() throws ServletException {
			setupRedirection("/noMatch", "any");

			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("/some");
			Assertions.assertNull(servlet.rewriteTarget(request));
		}

		@Test
		void rewriteURIBlacklisted() throws ServletException {
			setupRedirection("/blacklist", "http://blacklist-host:1/context");
			servlet.getHostIncludeExclude().exclude("blacklist-host:1");

			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("/blacklist/any");
			Assertions.assertNull(servlet.rewriteTarget(request));
		}

		@Test
		void rewriteURI() throws ServletException {
			setupRedirection("/rest", "http://proxified:1/endpoint");
			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("context/rest/any");
			final var rewriteURI = servlet.rewriteTarget(request);
			Assertions.assertEquals("http://proxified:1/endpoint/any", rewriteURI);
		}

		/**
		 * Blacklist management
		 */
		@Test
		void rewriteURIInvalidTarget() throws ServletException {
			servlet.getHostIncludeExclude().exclude(("proxy:1"));
			setupRedirection("/rest", "http://proxy:1/endpoint");
			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("context/rest/any");
			final var rewriteURI = servlet.rewriteTarget(request);
			Assertions.assertNull(rewriteURI);
		}

		@Test
		void rewriteURIInvalidUri() throws ServletException {
			servlet.getHostIncludeExclude().exclude("proxy:1");
			setupRedirection("/rest", ":invalid:uri");
			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("context/rest/any");
			final var rewriteURI = servlet.rewriteTarget(request);
			Assertions.assertNull(rewriteURI);
		}

		@Test
		void rewriteURIWithQuery() throws ServletException {
			setupRedirection("/rest", "http://proxy:1/endpoint");
			final var request = mock(HttpServletRequest.class);
			when(request.getRequestURI()).thenReturn("context/rest/any");
			when(request.getQueryString()).thenReturn("query");
			final var rewriteURI = servlet.rewriteTarget(request);
			Assertions.assertEquals("http://proxy:1/endpoint/any?query", rewriteURI);
		}

		private void rewriteURI(final String proxy, final String query, final String rewrite) throws ServletException {
			setupRedirection("/rest", proxy);
			final var request = mock(HttpServletRequest.class);
			when(request.getParameter("api-key")).thenReturn("api-key=VALUE-1-a");
			when(request.getRequestURI()).thenReturn("context/rest/any");
			when(request.getQueryString()).thenReturn(query);
			final var rewriteURI = servlet.rewriteTarget(request);
			Assertions.assertEquals(rewrite, rewriteURI);
		}

		@Test
		void rewriteURIWithSoloApiInQuery() throws ServletException {
			rewriteURI("http://proxified:1/endpoint", "api-key=VALUE-1-a", "http://proxified:1/endpoint/any");
		}

		@Test
		void rewriteURIWithInsertedApiInQuery() throws ServletException {
			rewriteURI("http://proxified:1/endpoint", "p=2&api-key=VALUE-1-a&q=3&r",
					"http://proxified:1/endpoint/any?p=2&q=3&r");
		}

		@Test
		void rewriteURIWithInsertedApiStartQuery() throws ServletException {
			rewriteURI("http://proxified:1/endpoint", "api-key=VALUE-1-a&q=3&r", "http://proxified:1/endpoint/any?q=3&r");
		}

		@Test
		void rewriteURIWithApiNotQuery() throws ServletException {
			rewriteURI("http://proxified:1/endpoint", "query", "http://proxified:1/endpoint/any?query");
		}

		private void setupRedirection(final String prefix, final String proxyTo) throws ServletException {
			final var servletConfig = mock(ServletConfig.class);
			when(servletConfig.getServletName()).thenReturn("a");
			when(servletContext.getContextPath()).thenReturn("context");
			when(servletConfig.getServletContext()).thenReturn(servletContext);
			when(servletConfig.getInitParameter("proxyTo")).thenReturn(proxyTo);
			when(servletConfig.getInitParameter("prefix")).thenReturn(prefix);
			when(servletConfig.getInitParameter("maxThreads")).thenReturn(MAX_THREADS);
			when(servletConfig.getInitParameter("idleTimeout")).thenReturn("120000");
			when(servletConfig.getInitParameter("timeout")).thenReturn("0");
			when(servletConfig.getInitParameter("apiKeyParameter")).thenReturn("api-key");
			when(servletConfig.getInitParameter("apiKeyHeader")).thenReturn("x-api-key");
			when(servletConfig.getInitParameter("apiUserParameter")).thenReturn("api-user");
			when(servletConfig.getInitParameter("apiUserHeader")).thenReturn("x-api-user");
			when(servletConfig.getInitParameter("responseBufferSize")).thenReturn(String.valueOf(16 * 1024));
			when(servletConfig.getInitParameter("requestBufferSize")).thenReturn(String.valueOf(4 * 1024));
			when(servletConfig.getInitParameter("maxConnections")).thenReturn("512");
			when(servletConfig.getInitParameter("cors-origin")).thenReturn("*");
			when(servletConfig.getInitParameter("cors-vary")).thenReturn("Origin");
			when(servletConfig.getInitParameter("usernameOAuth2Attribute")).thenReturn("email");
			servlet.init(servletConfig);
		}

		@Test
		void addProxyHeaders() {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			final var session = mock(HttpSession.class);
			final var principal = mock(Principal.class);
			when(request.getSession(false)).thenReturn(session);
			when(session.getId()).thenReturn("J_SESSIONID");
			when(request.getUserPrincipal()).thenReturn(principal);
			when(principal.getName()).thenReturn("junit");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertEquals("junit", headers.get("SM_UNIVERSALID"));
			Assertions.assertEquals("J_SESSIONID", headers.get("SM_SESSIONID"));
		}

		@Test
		void addProxyHeadersOAuth2() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			final var session = mock(HttpSession.class);
			setupRedirection("/", "/");

			final var principal = mock(OAuth2AuthenticationToken.class);
			when(request.getSession(false)).thenReturn(session);
			when(session.getId()).thenReturn("J_SESSIONID");
			when(request.getUserPrincipal()).thenReturn(principal);
			final var oAuthUser = mock(OAuth2User.class);
			when(principal.getPrincipal()).thenReturn(oAuthUser);
			when(oAuthUser.getAttribute("email")).thenReturn("j@u");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertEquals("j@u", headers.get("SM_UNIVERSALID"));
			Assertions.assertEquals("J_SESSIONID", headers.get("SM_SESSIONID"));
		}

		/**
		 * Manage the session
		 */
		@Test
		void addProxyHeadersCookie() {
			final var session = mock(HttpSession.class);
			final var principal = mock(Principal.class);
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var proxyRequest = setupRequest(request, headers);
			when(request.getSession(false)).thenReturn(session);
			when(request.getHeader("cookie")).thenReturn("JSESSIONID=value1; OTHER1=value2   ;   OTHER2=value3  ");
			when(session.getId()).thenReturn("J_SESSIONID");
			when(request.getUserPrincipal()).thenReturn(principal);
			when(principal.getName()).thenReturn("junit");
			servlet.addProxyHeaders(request, proxyRequest);
			Assertions.assertEquals("junit", headers.get("SM_UNIVERSALID"));
			Assertions.assertEquals("J_SESSIONID", headers.get("SM_SESSIONID"));
			Assertions.assertEquals("OTHER1=value2; OTHER2=value3", headers.get("cookie"));
		}

		/**
		 * Manage the API key (parameter) without session
		 */
		@Test
		void addProxyHeadersApiParameters() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			when(request.getParameter("api-key")).thenReturn("token");
			when(request.getParameter("api-user")).thenReturn("user");
			setupRedirection("a", "a");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertEquals("user", headers.get("SM_UNIVERSALID"));
			Assertions.assertNull(headers.get("SM_SESSIONID"));
			Assertions.assertEquals("token", headers.get("x-api-key"));
		}

		/**
		 * Manage the API key (header) without session
		 */
		@Test
		void addProxyHeadersApiHeaders() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			when(request.getHeader("x-api-key")).thenReturn("token");
			when(request.getHeader("x-api-user")).thenReturn("user");
			setupRedirection("a", "a");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertEquals("user", headers.get("SM_UNIVERSALID"));
			Assertions.assertNull(headers.get("SM_SESSIONID"));
			Assertions.assertEquals("token", headers.get("x-api-key"));
		}

		/**
		 * Manage the API key (header) without session
		 */
		@Test
		void addProxyHeadersAnonymous() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);

			setupRedirection("a", "a");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertNull(headers.get("SM_UNIVERSALID"));
			Assertions.assertNull(headers.get("SM_SESSIONID"));
			Assertions.assertNull(headers.get("x-api-key"));
		}

		@SuppressWarnings("unchecked")
		private Request setupRequest(final HttpServletRequest request, final Map<String, Object> headers) {
			final var exchange = mock(Request.class);
			final Map<String, Object> attributes = Map.of("org.eclipse.jetty.proxy.clientRequest", request);
			when(exchange.getAttributes()).thenReturn(attributes);
			when(exchange.getHeaders()).thenReturn(HttpFields.build());
			final HttpFields.Mutable mHeaders = mock(HttpFields.Mutable.class);
			when(mHeaders.add(anyString(), anyString())).thenAnswer(invocation -> {
				final var name = (String) invocation.getArgument(0);
				final var value = (String) invocation.getArgument(1);
				headers.put(name, value);
				return mHeaders;
			});

			when(exchange.headers(any(Consumer.class))).thenAnswer(invocation -> {
				((Consumer<HttpFields.Mutable>) invocation.getArgument(0)).accept(mHeaders);
				return null;
			});
			when(request.getProtocol()).thenReturn("HTTP/1.1");
			return exchange;
		}

		/**
		 * Manage the API user without API user and session
		 */
		@Test
		void addProxyHeadersApiPartial1Headers() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			when(request.getHeader("x-api-user")).thenReturn("user");
			setupRedirection("a", "a");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertNull(headers.get("SM_UNIVERSALID"));
			Assertions.assertNull(headers.get("SM_SESSIONID"));
			Assertions.assertNull(headers.get("x-api-key"));
		}

		/**
		 * Manage the API key without API and without session
		 */
		@Test
		void addProxyHeadersApiPartial2Headers() throws ServletException {
			final var request = mock(HttpServletRequest.class);
			final var headers = new HashMap<String, Object>();
			final var exchange = setupRequest(request, headers);
			when(request.getHeader("x-api-key")).thenReturn("token");
			setupRedirection("a", "a");
			servlet.addProxyHeaders(request, exchange);
			Assertions.assertNull(headers.get("SM_UNIVERSALID"));
			Assertions.assertNull(headers.get("SM_SESSIONID"));
			Assertions.assertNull(headers.get("x-api-key"));
		}

		@Test
		void onProxyResponseFailure() throws IOException, ServletException {
			init();
			final var response = mock(HttpServletResponse.class);
			final var byteArrayOutputStream = new ByteArrayOutputStream();
			when(response.getOutputStream()).thenReturn(new DelegatingServletOutputStream(byteArrayOutputStream));
			final var request = mock(HttpServletRequest.class);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseFailure(request, response, null, new Exception());
			verify(response).setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
			Assertions.assertEquals("{\"code\":\"business-down\"}",
					byteArrayOutputStream.toString(StandardCharsets.UTF_8));
		}

		@Test
		void onProxyResponseFailureNotClosable() throws IOException, ServletException {
			init();
			final var response = mock(HttpServletResponse.class);
			final var os = mock(ServletOutputStream.class);
			doThrow(new IOException()).when(os).write(ArgumentMatchers.any(byte[].class));
			when(response.getOutputStream()).thenReturn(os);
			final var request = mock(HttpServletRequest.class);
			final var asyncContext = mock(AsyncContext.class);
			when(request.isAsyncStarted()).thenReturn(true);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseFailure(request, response, null, new Exception());
		}

		@Test
		void onProxyResponseFailureAsyncNotStarted() throws IOException, ServletException {
			init();
			final var response = mock(HttpServletResponse.class);
			final var os = mock(ServletOutputStream.class);
			doThrow(new IOException()).when(os).write(ArgumentMatchers.any(byte[].class));
			when(response.getOutputStream()).thenReturn(os);
			final var request = mock(HttpServletRequest.class);
			servlet.onProxyResponseFailure(request, response, null, new Exception());
			verify(request, times(0)).getAsyncContext();
		}

		@Test
		void onProxyResponseFailureTimeout() throws IOException, ServletException {
			init();
			final var response = mock(HttpServletResponse.class);
			final var byteArrayOutputStream = new ByteArrayOutputStream();
			when(response.getOutputStream()).thenReturn(new DelegatingServletOutputStream(byteArrayOutputStream));
			final var request = mock(HttpServletRequest.class);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseFailure(request, response, null, new TimeoutException());
			verify(response).setStatus(HttpServletResponse.SC_GATEWAY_TIMEOUT);
		}

		@Test
		void onProxyResponseFailureCommitted() throws IOException, ServletException {
			init();
			final var response = mock(HttpServletResponse.class);
			final var os = mock(ServletOutputStream.class);
			doThrow(new IOException()).when(os).write(ArgumentMatchers.any(byte[].class));
			when(response.getOutputStream()).thenReturn(os);
			when(response.isCommitted()).thenReturn(true);
			final var request = mock(HttpServletRequest.class);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseFailure(request, response, null, new Exception());
		}

		@Test
		void filterServerResponseHeaderSkipXContent() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("x-content-type-options", null)));
		}

		@Test
		void filterServerResponseHeaderSkipXFrame() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("x-frame-options", null)));
		}

		@Test
		void filterServerResponseHeaderSkipXXss() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("x-xss-protection", null)));
		}

		@Test
		void filterServerResponseHeaderSkipPragma() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("pragma", null)));
		}

		@Test
		void filterServerResponseHeaderSkipCacheControl() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("cache-control", null)));
		}

		@Test
		void filterServerResponseHeaderSkipVisited() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("visited", null)));
		}

		@Test
		void filterServerResponseHeaderSkipServer() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("Server", null)));
		}

		@Test
		void filterServerResponseHeaderSkipExpires() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("Expires", null)));
		}

		@Test
		void filterServerResponseHeaderSkipDate() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("Date", null)));
		}

		@Test
		void filterServerResponseHeader() {
			Assertions.assertEquals("Content-Type: application/json;charset=UTF-8",
					servlet.filterServerResponseHeader(null, null, new HttpField("Content-Type", "application/json;charset=UTF-8")).toString());
		}

		@Test
		void filterServerResponseHeaderSessionID() {
			Assertions.assertNull(servlet.filterServerResponseHeader(null, null, new HttpField("set-cookie", "JSESSIONID=BLOCKED")));
		}

		@Test
		void filterServerResponseHeaderOk() {
			Assertions.assertEquals("set-cookie: SOME=PASS", servlet.filterServerResponseHeader(null, null, new HttpField("set-cookie", "SOME=PASS")).toString());
		}

		private void assertApiRequest(String header, String value) {
			final var request = mock(HttpServletRequest.class);
			when(request.getHeader(header)).thenReturn(value);
			Assertions.assertTrue(BackendProxyServlet.isApiRequest(request));
		}

		@Test
		void isApiRequestXRequest() {
			assertApiRequest("X-Requested-With", "XMLHttpRequest");
		}

		@Test
		void isApiRequest() {
			assertApiRequest("Content-type", "application/json");
		}

		@Test
		void getRoot() {
			final var request = mock(HttpServletRequest.class);
			Assertions.assertEquals(request, servlet.getRoot(new HttpServletRequestWrapper(request)));
		}

		/**
		 * 404 Error for non Ajax request forward to the normal 404 page.
		 */
		@Test
		void onProxyResponseSuccessForward() throws ServletException, IOException {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			final var dispatcher = mock(RequestDispatcher.class);
			final var outputStream = mock(ServletOutputStream.class);
			when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Macintosh; Intel Mac)");
			when(proxyResponse.getOutputStream()).thenReturn(outputStream);
			when(servletContext.getRequestDispatcher("/404.html")).thenReturn(dispatcher);
			when(response.getStatus()).thenReturn(HttpServletResponse.SC_NOT_FOUND);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseSuccess(request, proxyResponse, response);
			verify(dispatcher, times(1)).forward(request, proxyResponse);
		}

		@Test
		void onProxyResponseSuccessForwardError() throws ServletException, IOException {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			final var dispatcher = mock(RequestDispatcher.class);
			final var toBeThrown = new ServletException();
			when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Macintosh; Intel Mac)");
			doThrow(toBeThrown).when(dispatcher).forward(request, proxyResponse);
			when(servletContext.getRequestDispatcher("/404.html")).thenReturn(dispatcher);
			when(response.getStatus()).thenReturn(HttpServletResponse.SC_NOT_FOUND);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseSuccess(request, proxyResponse, response);
			verify(dispatcher, times(1)).forward(ArgumentMatchers.any(ServletRequest.class), ArgumentMatchers.same(proxyResponse));
		}

		@Test
		void onProxyResponseSuccess() throws IOException {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			final var outputStream = mock(ServletOutputStream.class);
			when(proxyResponse.getOutputStream()).thenReturn(outputStream);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			servlet.onProxyResponseSuccess(request, proxyResponse, response);
			verify(asyncContext, times(1)).complete();
		}

		@Test
		void onProxyResponseSuccessContentForbiddenAjax() throws IOException {
			checkStatusForward(HttpServletResponse.SC_FORBIDDEN);
		}

		@Test
		void onProxyResponseSuccessContentUnAuthorizedAjax() throws IOException {
			checkStatusForward(HttpServletResponse.SC_UNAUTHORIZED);
		}

		@Test
		void onProxyResponseSuccessContentNotFoundAjax() throws IOException {
			checkStatusForward(HttpServletResponse.SC_NOT_FOUND);
		}

		@Test
		void onProxyResponseSuccessServerErrorAjax() throws IOException {
			checkStatusForward(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
		}

		@Test
		void onProxyResponseSuccessMethodErrorAjax() throws IOException {
			checkStatusForward(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
		}

		private void checkStatusForward(final int status) throws IOException {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			when(request.getHeader("X-Requested-With")).thenReturn("XMLHttpRequest");
			final var outputStream = mock(ServletOutputStream.class);
			when(proxyResponse.getOutputStream()).thenReturn(outputStream);
			final var asyncContext = mock(AsyncContext.class);
			when(request.getAsyncContext()).thenReturn(asyncContext);
			when(response.getStatus()).thenReturn(status);
			servlet.onProxyResponseSuccess(request, proxyResponse, response);
			verify(asyncContext, times(1)).complete();
		}

		@Test
		void onResponseHeaders() {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			when(response.getHeaders()).thenReturn(HttpFields.build());
			servlet.onServerResponseHeaders(request, proxyResponse, response);
			verify(proxyResponse, never()).addHeader("Content-Type", "text/html");
		}

		@Test
		void onResponseHeadersNotFoundAjax() {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			when(request.getHeader("X-Requested-With")).thenReturn("XMLHttpRequest");
			when(response.getStatus()).thenReturn(HttpServletResponse.SC_NOT_FOUND);
			when(response.getHeaders()).thenReturn(HttpFields.build());
			servlet.onServerResponseHeaders(request, proxyResponse, response);
			verify(proxyResponse, never()).addHeader("Content-Type", "text/html");
		}

		@Test
		void onResponseHeadersNotFound() {
			final var request = mock(HttpServletRequest.class);
			final var proxyResponse = mock(HttpServletResponse.class);
			final var response = mock(Response.class);
			when(response.getStatus()).thenReturn(HttpServletResponse.SC_NOT_FOUND);
			when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Macintosh; Intel Mac)");
			servlet.onServerResponseHeaders(request, proxyResponse, response);
			verify(proxyResponse, times(1)).addHeader("Content-Type", "text/html");
		}

		@Test
		void getRequiredInitParameter() {
			final var servletConfig = mock(ServletConfig.class);

			when(servletConfig.getServletName()).thenReturn("a");
			when(servletContext.getContextPath()).thenReturn("context");
			when(servletConfig.getServletContext()).thenReturn(servletContext);
			when(servletConfig.getInitParameter("prefix")).thenReturn("prefix");
			when(servletConfig.getInitParameter("maxThreads")).thenReturn(MAX_THREADS);
			Assertions.assertThrows(UnavailableException.class, () -> servlet.init(servletConfig));
		}

		@Test
		void findConnectionHeaders() {
			var request = mock(HttpServletRequest.class);
			when(request.getHeaders(HttpHeader.CONNECTION.asString())).thenReturn(Collections.emptyEnumeration());
			servlet.findConnectionHeaders(request);
		}

	}
}