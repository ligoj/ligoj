/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.internal.verification.Times;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Test class of {@link CookieWipingLogoutHandler}
 */
class CookieWipingLogoutHandlerTest {

	@Test
	void logout() {
		var handler = new CookieWipingLogoutHandler(new String[] { "JSESSIONID" });
		final HttpServletRequest request = mock(HttpServletRequest.class);
		final HttpServletResponse response = mock(HttpServletResponse.class);
		handler.logout(request, response, null);
		verify(response, new Times(2)).addCookie(ArgumentMatchers.any());
	}

}