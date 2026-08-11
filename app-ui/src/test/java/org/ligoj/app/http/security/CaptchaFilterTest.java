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
import org.springframework.mock.web.DelegatingServletOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link CaptchaFilter}
 */
class CaptchaFilterTest {

	@Test
	void testDoFilterNoSession() throws ServletException, IOException {
		final var request = mock(HttpServletRequest.class);
		final var response = mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		when(response.getOutputStream()).thenReturn(out);
		new CaptchaFilter().doFilter(request, response, null);
		verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilterNoCaptcha() throws ServletException, IOException {
		final var request = mock(HttpServletRequest.class);
		final var session = mock(HttpSession.class);
		final var response = mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		when(response.getOutputStream()).thenReturn(out);
		when(request.getSession(false)).thenReturn(session);
		new CaptchaFilter().doFilter(request, response, null);
		verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"session\":\"null\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilterInvalidCaptcha() throws ServletException, IOException {
		final var request = mock(HttpServletRequest.class);
		final var session = mock(HttpSession.class);
		final var response = mock(HttpServletResponse.class);
		final var stream = new ByteArrayOutputStream();
		final var out = new DelegatingServletOutputStream(stream);
		when(response.getOutputStream()).thenReturn(out);
		when(request.getSession(false)).thenReturn(session);
		when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("some");
		final var captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();
		when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, null);
		verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
		Assertions.assertEquals("{\"errors\":{\"captcha\":\"invalid\"}}", stream.toString(StandardCharsets.UTF_8));
	}

	@Test
	void testDoFilter() throws ServletException, IOException {
		final var request = mock(HttpServletRequest.class);
		final var session = mock(HttpSession.class);
		final var response = mock(HttpServletResponse.class);
		final var chain = mock(FilterChain.class);
		when(request.getSession(false)).thenReturn(session);
		when(request.getHeader(CaptchaFilter.CAPTCHA_HEADER)).thenReturn("check");
		final var captcha = new Captcha.Builder(200, 50).addText(() -> "check").build();

		when(session.getAttribute(Captcha.NAME)).thenReturn(captcha);
		new CaptchaFilter().doFilter(request, response, chain);
		verify(session).removeAttribute(Captcha.NAME);
		verify(chain).doFilter(request, response);
	}

}