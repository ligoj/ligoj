/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;

/**
 * Test class of {@link CaptchaServlet}
 */
class CaptchaServletTest {

	@Test
	void testDoGet() throws IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpSession session = Mockito.mock(HttpSession.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ServletOutputStream outputStream = Mockito.mock(ServletOutputStream.class);
		Mockito.when(response.getOutputStream()).thenReturn(outputStream);
		Mockito.when(request.getSession()).thenReturn(session);
		new CaptchaServlet().doGet(request, response);
		Mockito.verify(response).setContentType("image/png");
	}

}