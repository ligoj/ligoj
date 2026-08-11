/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.mockito.Mockito.*;

/**
 * Test class of {@link CaptchaServlet}
 */
class CaptchaServletTest {

	@Test
	void testDoGet() throws IOException {
		final HttpServletRequest request = mock(HttpServletRequest.class);
		final HttpSession session = mock(HttpSession.class);
		final HttpServletResponse response = mock(HttpServletResponse.class);
		final ServletOutputStream outputStream = mock(ServletOutputStream.class);
		when(response.getOutputStream()).thenReturn(outputStream);
		when(request.getSession()).thenReturn(session);
		new CaptchaServlet().doGet(request, response);
		verify(response).setContentType("image/png");
	}

}