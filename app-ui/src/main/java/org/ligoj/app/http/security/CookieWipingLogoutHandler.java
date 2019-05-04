/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.util.Arrays;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;

import lombok.AllArgsConstructor;

/**
 * A logout handler which clears a defined list of cookies, using the context path and '/' as the
 * cookie path.
 */
@AllArgsConstructor
public final class CookieWipingLogoutHandler implements LogoutHandler {
	private final String[] cookiesToClear;

	@Override
	public void logout(final HttpServletRequest request, final HttpServletResponse response, final Authentication authentication) {
		Arrays.stream(cookiesToClear).forEach(c -> {
			var cookie = new Cookie(c, null);
			cookie.setPath(request.getContextPath() + "/");
			cookie.setMaxAge(0);
			response.addCookie(cookie);

			var cookie2 = new Cookie(c, null);
			cookie2.setPath("/");
			cookie2.setMaxAge(0);
			response.addCookie(cookie2);
		});
	}
}
