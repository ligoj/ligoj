package org.ligoj.app.http.security;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.junit.Test;
import org.mockito.Mockito;

/**
 * Test class of {@link CaptchaServlet}
 */
public class CaptchaServletTest {

	@Test
	public void testDoGet() throws ServletException, IOException {
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpSession session = Mockito.mock(HttpSession.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		final ServletOutputStream outputstream = Mockito.mock(ServletOutputStream.class);
		Mockito.when(response.getOutputStream()).thenReturn(outputstream);
		Mockito.when(request.getSession()).thenReturn(session);
		new CaptchaServlet().doGet(request, response);
	}

}