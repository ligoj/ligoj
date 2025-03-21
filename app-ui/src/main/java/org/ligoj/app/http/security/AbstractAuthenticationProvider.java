/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

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

	public HttpSecurity configureLogout(HttpSecurity http,
			final ClientRegistrationRepository clientRegistrationRepository,
			final String logoutUrl, final String[] securityPreAuthCookies) throws Exception {
		return http.logout(a ->
				a.addLogoutHandler(new CookieWipingLogoutHandler(securityPreAuthCookies))
						.invalidateHttpSession(true)
						.logoutSuccessUrl(logoutUrl));
	}

	public HttpSecurity configureLogin(HttpSecurity http, final String loginUrlDenied, final String loginApiUrl,
			final AuthenticationSuccessHandler successHandler,
			final AuthenticationFailureHandler failureHandler) throws Exception {
		// Standard self-hosted 'form' login
		return http.formLogin(a -> a
				.loginPage(loginUrlDenied)
				.loginProcessingUrl(loginApiUrl)
				.successHandler(successHandler)
				.failureHandler(failureHandler));
	}

}
