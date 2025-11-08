/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
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
	 * When true, redirects must be followed for login/logout responses.
	 */
	@Getter
	private boolean forceRedirect;

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

	/**
	 * Configure the logout flow.
	 *
	 * @param http                   HTTP security.
	 * @param logoutUrl              The URL to redirect to after logout has occurred.
	 * @param securityPreAuthCookies The wiping cookies.
	 * @return The HttpSecurity parameter for the chaining.
	 * @throws Exception From {@link HttpSecurity#logout(Customizer)}
	 */
	public HttpSecurity configureLogout(HttpSecurity http,
			final String logoutUrl, final String[] securityPreAuthCookies) throws Exception {
		return http.logout(a ->
				a.addLogoutHandler(new CookieWipingLogoutHandler(securityPreAuthCookies))
						.invalidateHttpSession(true)
						.logoutSuccessUrl(logoutUrl));
	}

	/**
	 * Configure the login flow.
	 *
	 * @param http           HTTP security.
	 * @param loginUrlDenied Specifies the URL to send users to if login is required.
	 * @param loginApiUrl    Specifies the URL to validate the credentials.
	 * @param successHandler Specifies the {@link AuthenticationSuccessHandler} to be used.
	 * @param failureHandler Specifies the {@link AuthenticationFailureHandler} to use when authentication fails.
	 * @return The HttpSecurity parameter for the chaining.
	 * @throws Exception From {@link HttpSecurity#formLogin(Customizer)}
	 */
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
