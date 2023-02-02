/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.mockito.internal.verification.Times;

/**
 * Test class of {@link CookieWipingLogoutHandler}
 */
class CookieWipingLogoutHandlerTest {

	@Test
	void logout() {
		var handler = new CookieWipingLogoutHandler(new String[] { "JSESSIONID" });
		final HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
		final HttpServletResponse response = Mockito.mock(HttpServletResponse.class);
		handler.logout(request, response, null);
		Mockito.verify(response, new Times(2)).addCookie(ArgumentMatchers.any());
	}

}