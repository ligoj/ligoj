/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.mockito.ArgumentMatchers;
import org.springframework.mock.web.DelegatingServletOutputStream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link WebjarsServlet}
 */
class WebjarsServletTest {

	private ClassLoader classloader;

	@BeforeEach
	void saveClassloader() {
		//noinspection resource
		Thread.currentThread().getContextClassLoader().getResourceAsStream("META-INF/resources/webjars/image.png");
		classloader = Thread.currentThread().getContextClassLoader();
	}

	@AfterEach
	void restoreClassloader() {
		Thread.currentThread().setContextClassLoader(classloader);
	}

	@Test
	void mustNotBeADirectory() throws Exception {
		final var request = mock(HttpServletRequest.class);
		when(request.getRequestURI()).thenReturn("/context-path/webjars/");
		when(request.getContextPath()).thenReturn("/context-path");
		final var response = mock(HttpServletResponse.class);
		getServlet("false").doGet(request, response);

		// 404 error, even for a directory listing
		verify(response).sendError(404);
	}

	@Test
	void mustRejectPathTraversal() throws Exception {
		final var request = mock(HttpServletRequest.class);
		when(request.getRequestURI()).thenReturn("/context-path/webjars/../../../etc/passwd");
		when(request.getContextPath()).thenReturn("/context-path");
		final var response = mock(HttpServletResponse.class);
		getServlet("false").doGet(request, response);

		// Traversal escaping META-INF/resources is a 404, and no resource lookup is attempted
		verify(response).sendError(404);
	}

	@Test
	void fileNotFound() throws Exception {
		final var request = defaultRequest("error.png");
		final var response = mock(HttpServletResponse.class);

		getServlet("false").doGet(request, response);
		verify(response).sendError(ArgumentMatchers.anyInt());
	}

	@Test
	void fileNotFoundIOE() throws Exception {
		final var request = defaultRequest("IOException");
		final var response = mock(HttpServletResponse.class);

		getServlet("false").doGet(request, response);
		verify(response).sendError(ArgumentMatchers.anyInt());
	}

	@Test
	void downloadFile() throws Exception {
		final var webjarResource = "META-INF/resources/webjars/image.png";
		final var request = defaultRequest();
		final var response = mock(HttpServletResponse.class);

		final var baos = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(baos);
		when(response.getOutputStream()).thenReturn(out);
		final var urls = new ArrayList<URL>();
		final var url = Thread.currentThread().getContextClassLoader().getResource(webjarResource);
		urls.add(url);
		urls.add(url);
		getServlet("false", true, urls).doGet(request, response);
		Assertions.assertEquals("image-content", baos.toString(StandardCharsets.UTF_8));
		verify(response).setContentType("image/x-png");
		getServlet("false", false, urls).doGet(request, response);
		verify(response, never()).setStatus(ArgumentMatchers.anyInt());
		verify(response, never()).sendError(ArgumentMatchers.anyInt());
	}

	@Test
	void ioExceptionIsNotPropagated() throws Exception {
		// S1989: an IO failure (here, sendError on a broken connection) must be
		// swallowed by doGet — and mapped to a 500 while the response is still open.
		final var request = defaultRequest("error.png");
		final var response = mock(HttpServletResponse.class);
		doThrow(new IOException()).when(response).sendError(ArgumentMatchers.anyInt());

		Assertions.assertDoesNotThrow(() -> getServlet("false").doGet(request, response));
		verify(response).setStatus(500);
	}

	@Test
	void ioExceptionIsNotPropagatedCommitted() throws Exception {
		// Same as above with an already-committed response (e.g. broken pipe
		// mid-transfer): no status rewrite is possible, still no propagation.
		final var request = defaultRequest("error.png");
		final var response = mock(HttpServletResponse.class);
		doThrow(new IOException()).when(response).sendError(ArgumentMatchers.anyInt());
		when(response.isCommitted()).thenReturn(true);

		Assertions.assertDoesNotThrow(() -> getServlet("false").doGet(request, response));
		verify(response, never()).setStatus(ArgumentMatchers.anyInt());
	}

	@Test
	void fileNameIsEmpty() throws Exception {
		// "/" has no file name (Paths#getFileName == null) → empty name, default MIME type
		final var response = mock(HttpServletResponse.class);
		final var baos = new ByteArrayOutputStream();
		when(response.getOutputStream()).thenReturn(new DelegatingServletOutputStream(baos));
		getServlet("false").serveFile(response, "/",
				new ByteArrayInputStream("content".getBytes(StandardCharsets.UTF_8)));
		verify(response).setContentType("application/octet-stream");
	}

	@Test
	void mimeTypeIsNotFound() throws Exception {
		final var response = mock(HttpServletResponse.class);
		final var baos = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(baos);
		when(response.getOutputStream()).thenReturn(out);
		final var servlet = getServlet("false");
		servlet.serveFile(response, "image.bin",
				new ByteArrayInputStream("image-content".getBytes(StandardCharsets.UTF_8)));
		Assertions.assertEquals("image-content", baos.toString(StandardCharsets.UTF_8));
		verify(response).setContentType("application/octet-stream");
	}

	@Test
	void mimeTypeIsCustom() throws Exception {
		final var response = mock(HttpServletResponse.class);
		final var baos = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(baos);
		when(response.getOutputStream()).thenReturn(out);
		final var servlet = getServlet("false");
		servlet.serveFile(response, "image.woff2",
				new ByteArrayInputStream("image-content".getBytes(StandardCharsets.UTF_8)));
		Assertions.assertEquals("image-content", baos.toString(StandardCharsets.UTF_8));
		verify(response).setContentType("font/woff2");
	}

	@Test
	void inputStreamIsClosedAfterException() throws Exception {
		final var response = mock(HttpServletResponse.class);
		final var servlet = getServlet("false");
		final var inputStream = mock(InputStream.class);
		when(inputStream.transferTo(ArgumentMatchers.any())).thenThrow(new TechnicalException(""));
		Assertions.assertThrows(TechnicalException.class, () -> servlet.serveFile(response, "image.png", inputStream));
		verify(inputStream).close();
	}

	private HttpServletRequest defaultRequest() {
		return defaultRequest("image.png");
	}

	private HttpServletRequest defaultRequest(final String file) {
		final var request = mock(HttpServletRequest.class);
		when(request.getRequestURI()).thenReturn("/context-path/webjars/" + file);
		when(request.getContextPath()).thenReturn("/context-path");
		return request;
	}

	private WebjarsServlet getServlet(final String disableCache) throws ServletException {
		return getServlet(disableCache, true, null);
	}


	private WebjarsServlet getServlet(final String disableCache, boolean fileHasMorePriority, List<URL> urls) throws ServletException {
		final var servlet = new MyWebjarsServlet(fileHasMorePriority, urls);
		final var servletConfig = mock(ServletConfig.class);
		final var servletContext = mock(ServletContext.class);
		when(servletConfig.getInitParameter("disableCache")).thenReturn(disableCache);
		when(servletContext.getMimeType("image.png")).thenReturn("image/x-png");
		when(servletConfig.getServletContext()).thenReturn(servletContext);
		servlet.init(servletConfig);
		return servlet;
	}

	private static class MyWebjarsServlet extends WebjarsServlet {

		private final boolean fileHasMorePriority;
		private final List<URL> urls;

		public MyWebjarsServlet(boolean fileHasMorePriority, List<URL> urls) {
			this.fileHasMorePriority = fileHasMorePriority;
			this.urls = urls;
		}

		@Override
		protected boolean hasMorePriority(URL url) {
			return fileHasMorePriority && super.hasMorePriority(url);
		}

		@Override
		protected Enumeration<URL> getResources(String webjarsResourceURI) throws IOException {
			if ("META-INF/resources/webjars/IOException".equalsIgnoreCase(webjarsResourceURI)) {
				throw new IOException();
			}
			return urls == null ? super.getResources(webjarsResourceURI) : Collections.enumeration(urls);
		}
	}
}
