/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.springframework.security.authentication.AuthenticationProvider;

import lombok.Getter;
import lombok.Setter;

/**
 * Base implementation of very basic SSO implementation.
 */
@Setter
public abstract class AbstractAuthenticationProvider implements AuthenticationProvider {

	/**
	 * SSO post URL.
	 */
	@Getter
	private String ssoPostUrl;

	/**
	 * SSO post content format.
	 */
	@Getter
	private String ssoPostContent;

	/**
	 * SSO get format.
	 */
	private String ssoWelcome;

	/**
	 * Authentication supports.
	 * {@inheritDoc}
	 * 
	 * @return Always <code>true</code>
	 */
	@Override
	public boolean supports(final Class<?> authentication) {
		return true;
	}
}
