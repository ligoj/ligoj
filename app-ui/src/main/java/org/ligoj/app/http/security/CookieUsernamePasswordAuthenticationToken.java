/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.Getter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;
import java.util.List;

/**
 * Authentication token with back-office cookies to forward to end-user.
 */
@Getter
public class CookieUsernamePasswordAuthenticationToken extends UsernamePasswordAuthenticationToken {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * List of forwarded cookies' names.
	 */
	private final List<String> cookies;

	/**
	 * This constructor should only be used by <code>AuthenticationManager</code> or <code>AuthenticationProvider</code>
	 * implementations that are satisfied with producing a trusted (i.e. {@link #isAuthenticated()} = <code>true</code>)
	 * authentication token.
	 *
	 * @param principal   User principal
	 * @param credentials Temporary credentials.
	 * @param authorities Global authorities.
	 * @param cookies     Back-office cookies.
	 */
	public CookieUsernamePasswordAuthenticationToken(final Object principal, final Object credentials,
			final Collection<? extends GrantedAuthority> authorities, final List<String> cookies) {
		super(principal, credentials, authorities);
		this.cookies = cookies;
	}

}
