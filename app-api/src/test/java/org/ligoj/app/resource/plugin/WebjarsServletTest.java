/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.mock.web.DelegatingServletOutputStream;

/**
 * Test class of {@link WebjarsServlet}
 */
public class WebjarsServletTest {

	private ClassLoader classloader;

	@BeforeEach
	public void saveClassloader() {
		Thread.currentThread().getContextClassLoader().getResourceAsStream("META-INF/resources/webjars/image.png");
		classloader = Thread.currentThread().getContextClassLoader();
	}

	@AfterEach
	public void restoreClassloader() {
		Thread.currentThread().setContextClassLoader(classloader);
	}

	@Test
	public void mustNotBeADirectory() throws Exception {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		Mockito.when(request.getRequestURI()).thenReturn("/context-path/webjars/");
		Mockito.when(request.getContextPath()).thenReturn("/context-path");
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		getServlet("false").doGet(request, response);

		// 404 error, even for a directory listing
		Mockito.verify(response).sendError(404);
	}

	@Test
	public void fileNotFound() throws Exception {
		final HttpServletRequest request = defaultRequest("error.png");
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);

		getServlet("false").doGet(request, response);
		Mockito.verify(response).sendError(ArgumentMatchers.anyInt());
	}

	@Test
	public void downloadFile() throws Exception {
		final HttpServletRequest request = defaultRequest();
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);

		final ClassLoader classLoader = Mockito.mock(ClassLoader.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		final List<URL> urlsAsList = new ArrayList<>();
		final URL url = Thread.currentThread().getContextClassLoader().getResource("META-INF/resources/webjars/image.png");
		urlsAsList.add(url);
		urlsAsList.add(url);
		final Enumeration<URL> urls = Collections.enumeration(urlsAsList);
		Mockito.when(classLoader.getResources("META-INF/resources/webjars/image.png")).thenReturn(urls);
		Thread.currentThread().setContextClassLoader(classLoader);
		getServlet("false").doGet(request, response);
		Assertions.assertEquals("image-content", new String(baos.toByteArray(), StandardCharsets.UTF_8));
		Mockito.verify(response).setContentType("image/x-png");
		Mockito.verify(response, Mockito.never()).setStatus(ArgumentMatchers.anyInt());
		Mockito.verify(response, Mockito.never()).sendError(ArgumentMatchers.anyInt());
	}

	@Test
	public void mimeTypeIsNotFound() throws Exception {
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		final WebjarsServlet servlet = getServlet("false");
		servlet.serveFile(response, "image.bin", new ByteArrayInputStream("image-content".getBytes(StandardCharsets.UTF_8)));
		Assertions.assertEquals("image-content", new String(baos.toByteArray(), StandardCharsets.UTF_8));
		Mockito.verify(response).setContentType("application/octet-stream");
	}

	@Test
	public void mimeTypeIsCustom() throws Exception {
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		final WebjarsServlet servlet = getServlet("false");
		servlet.serveFile(response, "image.woff2", new ByteArrayInputStream("image-content".getBytes(StandardCharsets.UTF_8)));
		Assertions.assertEquals("image-content", new String(baos.toByteArray(), StandardCharsets.UTF_8));
		Mockito.verify(response).setContentType("font/woff2");
	}

	@Test
	public void inputStreamIsClosedAfterException() throws Exception {
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final WebjarsServlet servlet = getServlet("false");
		final InputStream inputStream = Mockito.mock(InputStream.class);
		Mockito.when(inputStream.transferTo(ArgumentMatchers.any())).thenThrow(new TechnicalException(""));
		Assertions.assertThrows(TechnicalException.class, () -> servlet.serveFile(response, "image.png", inputStream));
		Mockito.verify(inputStream).close();
	}

	private HttpServletRequest defaultRequest() {
		return defaultRequest("image.png");
	}

	private HttpServletRequest defaultRequest(final String file) {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		Mockito.when(request.getRequestURI()).thenReturn("/context-path/webjars/" + file);
		Mockito.when(request.getContextPath()).thenReturn("/context-path");
		return request;
	}

	private WebjarsServlet getServlet(final String disableCache) throws ServletException {
		final WebjarsServlet servlet = new WebjarsServlet();
		final ServletConfig servletConfig = Mockito.mock(ServletConfig.class);
		final ServletContext servletContext = Mockito.mock(ServletContext.class);
		Mockito.when(servletConfig.getInitParameter("disableCache")).thenReturn(disableCache);
		Mockito.when(servletContext.getMimeType("image.png")).thenReturn("image/x-png");
		Mockito.when(servletConfig.getServletContext()).thenReturn(servletContext);
		servlet.init(servletConfig);
		return servlet;
	}
}
