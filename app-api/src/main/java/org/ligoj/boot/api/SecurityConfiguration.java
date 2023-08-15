/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.ligoj.app.resource.security.FederatedUserDetailsService;
import org.ligoj.bootstrap.core.security.ApiTokenAuthenticationFilter;
import org.ligoj.bootstrap.core.security.AuthorizingFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsByNameServiceWrapper;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.Http403ForbiddenEntryPoint;
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationProvider;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.security.web.authentication.switchuser.SwitchUserFilter;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

/**
 * Security configuration.
 */
@Configuration
@EnableWebSecurity
@Profile("prod")
@EnableMethodSecurity(jsr250Enabled = true, securedEnabled = true, prePostEnabled = true)
public class SecurityConfiguration {

	@Autowired
	private FederatedUserDetailsService userDetailsService;

	@Bean
	public SecurityFilterChain filterChain(final HttpSecurity http) throws Exception {
		final var authenticationManager = http.getSharedObject(AuthenticationManager.class);
		http.authorizeHttpRequests(authorize ->
				// WADL access
				authorize.requestMatchers(AntPathRequestMatcher.antMatcher("/rest")).authenticated()

						// Unsecured access
						.requestMatchers(EndpointRequest.to("health")).permitAll()
						.requestMatchers(
								AntPathRequestMatcher.antMatcher("/rest/redirect"),
								AntPathRequestMatcher.antMatcher("/manage/health"),
								AntPathRequestMatcher.antMatcher("/webjars/public/**")).permitAll()
						.requestMatchers(
								AntPathRequestMatcher.antMatcher("/rest/security/login"),
								AntPathRequestMatcher.antMatcher("/rest/service/password/reset/**"),
								AntPathRequestMatcher.antMatcher("/rest/service/password/recovery/**"))
						.anonymous()

						// Everything else is authenticated
						.anyRequest().fullyAuthenticated().and()

						// REST only
						.requestCache(a -> a.disable())
						.csrf(a -> a.disable())
						.sessionManagement(a -> a.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).and().securityContext().and()
						.exceptionHandling().authenticationEntryPoint(http403ForbiddenEntryPoint()).and()

						// Security filters
						.addFilterAt(apiTokenFilter(authenticationManager), AbstractPreAuthenticatedProcessingFilter.class)
						.addFilterAfter(authorizingFilter(), SwitchUserFilter.class)
		);
		return http.build();
	}

	@Bean
	public WebSecurityCustomizer webSecurityCustomizer() {
		return (web) -> web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
	}

	/**
	 * Configure {@link AuthenticationProvider}
	 *
	 * @param auth The builder.
	 */
	@Autowired
	public void configureGlobal(final AuthenticationManagerBuilder auth) {
		auth.eraseCredentials(true).authenticationProvider(authenticationProvider());
	}

	@Bean
	public AuthenticationManager authenticationManager(final AuthenticationConfiguration authenticationConfiguration)
			throws Exception {
		return authenticationConfiguration.getAuthenticationManager();
	}

	/**
	 * Authentication service.
	 *
	 * @return Authentication service.
	 */
	@Bean
	public UserDetailsByNameServiceWrapper<PreAuthenticatedAuthenticationToken> authenticationService() {
		final var userDetailsServiceW = new UserDetailsByNameServiceWrapper<PreAuthenticatedAuthenticationToken>();
		userDetailsServiceW.setUserDetailsService(userDetailsService);
		return userDetailsServiceW;
	}

	/**
	 * RBAC Authorizing filter.
	 *
	 * @return RBAC Authorizing filter.
	 */
	@Bean
	public AuthorizingFilter authorizingFilter() {
		return new AuthorizingFilter();
	}

	/**
	 * A 403 JSON management.
	 *
	 * @return A 403 JSON management.
	 */
	@Bean
	public Http403ForbiddenEntryPoint http403ForbiddenEntryPoint() {
		return new Http403ForbiddenEntryPoint();
	}

	/**
	 * Pre-Authentication provider.
	 *
	 * @return Pre-Authentication provider.
	 */
	@Bean
	public PreAuthenticatedAuthenticationProvider authenticationProvider() {
		final var provider = new PreAuthenticatedAuthenticationProvider();
		provider.setPreAuthenticatedUserDetailsService(authenticationService());
		return provider;
	}

	/**
	 * Simple API token.
	 *
	 * @return Simple API token.
	 * @throws Exception From {@link #authenticationManager(AuthenticationConfiguration)}
	 */
	@Bean
	public ApiTokenAuthenticationFilter apiTokenFilter(final AuthenticationManager authenticationManager)
			throws Exception {
		final var bean = new ApiTokenAuthenticationFilter();
		bean.setPrincipalRequestHeader("SM_UNIVERSALID");
		bean.setCredentialsRequestHeader("X-api-key");
		bean.setExceptionIfHeaderMissing(false);
		bean.setContinueFilterChainOnUnsuccessfulAuthentication(false);
		bean.setAuthenticationManager(authenticationManager);
		return bean;
	}

	/**
	 * Configure the firewall.
	 *
	 * @return Firewall configuration.
	 */
	@Bean
	public HttpFirewall allowUrlEncodedSlashHttpFirewall() {
		final var firewall = new DefaultHttpFirewall();
		firewall.setAllowUrlEncodedSlash(true);
		return firewall;
	}
}
