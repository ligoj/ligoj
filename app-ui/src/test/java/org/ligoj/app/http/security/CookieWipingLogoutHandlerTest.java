/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.mockito.internal.verification.Times;

/**
 * Test class of {@link CookieWipingLogoutHandler}
 */
public class CookieWipingLogoutHandlerTest {

	@Test
	public void logout() {
		var handler = new CookieWipingLogoutHandler(new String[] { "JSESSIONID" });
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		handler.logout(request, response, null);
		Mockito.verify(response, new Times(2)).addCookie(ArgumentMatchers.any());
	}

}