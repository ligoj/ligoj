/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

/**
 * OAuth authenticated provider.
 */
@Slf4j
public class OAuth2BffAuthenticationProvider extends AbstractAuthenticationProvider {

	@Autowired
	ClientRegistrationRepository clientRegistrationRepository;

	public OAuth2BffAuthenticationProvider() {
		this.setForceRedirect(true);
	}

	@Override
	public Authentication authenticate(final Authentication authentication) {
		return null;
	}

	@Override
	public HttpSecurity configureLogout(HttpSecurity http, final String logoutUrl, final String[] securityPreAuthCookies) throws Exception {
		return http.logout(a -> {
			final var logoutSuccessHandler = new OidcClientInitiatedLogoutSuccessHandler(clientRegistrationRepository);
			logoutSuccessHandler.setPostLogoutRedirectUri("{baseUrl}" + logoutUrl);
			a.logoutSuccessHandler(logoutSuccessHandler);
		});
	}

	@Override
	public HttpSecurity configureLogin(HttpSecurity http, final String loginUrlDenied, final String loginApiUrl,
			final AuthenticationSuccessHandler successHandler,
			final AuthenticationFailureHandler failureHandler) throws Exception {
		return http.oauth2Login(Customizer.withDefaults());
	}
}