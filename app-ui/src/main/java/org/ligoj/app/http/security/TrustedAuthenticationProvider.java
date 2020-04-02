/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.apache.commons.lang3.StringUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

/**
 * Always authenticated provider.
 */
public class TrustedAuthenticationProvider extends AbstractAuthenticationProvider {

	@Override
	public Authentication authenticate(final Authentication authentication) {
		final var userName = StringUtils.lowerCase(authentication.getPrincipal().toString());
		return new UsernamePasswordAuthenticationToken(userName, "N/A", authentication.getAuthorities());
	}

}