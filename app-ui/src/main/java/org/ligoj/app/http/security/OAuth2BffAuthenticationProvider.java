/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.Generated;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.ligoj.bootstrap.http.security.CookieUsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.Objects;
import java.util.Optional;

/**
 * OAuth authenticated provider.
 */
@Slf4j
public class OAuth2BffAuthenticationProvider extends AbstractAuthenticationProvider {

	@Override
	public Authentication authenticate(final Authentication authentication) {
		return null;
	}

	@Override
	public HttpSecurity configureLogout(HttpSecurity http, final ClientRegistrationRepository clientRegistrationRepository, final String logoutUrl, final String[] securityPreAuthCookies) throws Exception {
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