/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import cn.apiclub.captcha.Captcha;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.DelegatingServletOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Test class of {@link CaptchaFilter}
 */
class CaptchaFilterTest {

	@Test
	void testDoFilterNoSession() throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilterNoCaptcha() throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var session = Mockito.mock(HttpSession.class);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		Mockito.when(request.getSession(false)).thenReturn(session);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilterInvalidCaptcha() throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var session = Mockito.mock(HttpSession.class);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		Mockito.when(response.getOutputStream()).thenReturn(out);
		Mockito.when(request.getSession(false)).thenReturn(session);
		Mockito.when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("some");
		final var captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();
		Mockito.when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, null);
		Mockito.verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"captcha\":\"invalid\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilter() throws ServletException, IOException {
		final var request = Mockito.mock(HttpServletRequest.class);
		final var session = Mockito.mock(HttpSession.class);
		final var response = Mockito.mock(HttpServletResponse.class);
		final var chain = Mockito.mock(FilterChain.class);
		Mockito.when(request.getSession(false)).thenReturn(session);
		Mockito.when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("check");
		final var captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();

		Mockito.when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, chain);
		Mockito.verify(session).removeAttribute(Captcha.NAME);
		Mockito.verify(chain).doFilter(request, response);
	}

}