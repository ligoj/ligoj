package org.ligoj.app.http.security;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.DelegatingServletOutputStream;

import cn.apiclub.captcha.Captcha;

/**
 * Test class of {@link CaptchaFilter}
 */
public class CaptchaFilterTest {

	@Test
	public void testJavax() throws ServletException {
		new CaptchaFilter().init(null);
		new CaptchaFilter().destroy();
	}

	@Test
	public void testDoFilterNoSession() throws ServletException, IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", new String(baos.toByteArray(), StandardCharsets.UTF_8));
	}

	@Test
	public void testDoFilterNoCaptcha() throws ServletException, IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpSession session = Mockito.mock(HttpSession.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		Mockito.when(request.getSession(false)).thenReturn(session);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", new String(baos.toByteArray(), StandardCharsets.UTF_8));
	}

	@Test
	public void testDoFilterInvalidCaptcha() throws ServletException, IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpSession session = Mockito.mock(HttpSession.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		final ServletOutputStream out = new DelegatingServletOutputStream(baos);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		Mockito.when(request.getSession(false)).thenReturn(session);
		Mockito.when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("some");
		final Captcha captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();
		Mockito.when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"captcha\":\"invalid\"}}", new String(baos.toByteArray(), StandardCharsets.UTF_8));
	}

	@Test
	public void testDoFilter() throws ServletException, IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpSession session = Mockito.mock(HttpSession.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final FilterChain chain = Mockito.mock(FilterChain.class);
		Mockito.when(request.getSession(false)).thenReturn(session);
		Mockito.when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("check");
		final Captcha captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();

		Mockito.when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, chain);
		Mockito.verify(session).removeAttribute(Captcha.NAME);
		Mockito.verify(chain).doFilter(request, response);
	}

}