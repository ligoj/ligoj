/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.ligoj.bootstrap.core.security.ApiTokenAuthenticationFilter;
import org.ligoj.bootstrap.core.security.AuthorizingFilter;
import org.ligoj.bootstrap.core.security.RbacUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsByNameServiceWrapper;
import org.springframework.security.web.authentication.Http403ForbiddenEntryPoint;
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationProvider;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.security.web.authentication.switchuser.SwitchUserFilter;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.firewall.HttpFirewall;

@Configuration
@EnableWebSecurity
@Profile("prod")
@EnableGlobalMethodSecurity(jsr250Enabled = true, securedEnabled = true, prePostEnabled = true)
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {

	@Autowired
	private RbacUserDetailsService userDetailsService;

	@Override
	protected void configure(final HttpSecurity http) throws Exception {
		http.authorizeRequests()
				// WADL access
				.antMatchers("/rest").authenticated()

				// Unsecured access
				.requestMatchers(EndpointRequest.to("health")).permitAll().antMatchers("/rest/redirect", "/manage/health", "/webjars/public/**")
				.permitAll().antMatchers("/rest/security/login", "/rest/service/password/reset/**", "/rest/service/password/recovery/**").anonymous()
				.antMatchers("/rest/redirect").permitAll()

				// Everything else is authenticated
				.anyRequest().fullyAuthenticated().and()

				// REST only
				.requestCache().disable().csrf().disable().sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
				.securityContext().and().exceptionHandling().authenticationEntryPoint(http403ForbiddenEntryPoint()).and()

				// Security filters
				.addFilterAt(apiTokenFilter(), AbstractPreAuthenticatedProcessingFilter.class)
				.addFilterAfter(authorizingFilter(), SwitchUserFilter.class);
	}

	/**
	 * Configure {@link AuthenticationProvider}
	 *
	 * @param auth
	 *            The builder.
	 */
	@Autowired
	public void configureGlobal(final AuthenticationManagerBuilder auth) {
		auth.eraseCredentials(true).authenticationProvider(authenticationProvider());
	}

	/**
	 * Authentication service.
	 *
	 * @return Authentication service.
	 */
	@Bean
	public UserDetailsByNameServiceWrapper<PreAuthenticatedAuthenticationToken> authenticationService() {
		final UserDetailsByNameServiceWrapper<PreAuthenticatedAuthenticationToken> userDetailsServiceW = new UserDetailsByNameServiceWrapper<>();
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
		final PreAuthenticatedAuthenticationProvider provider = new PreAuthenticatedAuthenticationProvider();
		provider.setPreAuthenticatedUserDetailsService(authenticationService());
		return provider;
	}

	/**
	 * Simple API token.
	 *
	 * @return Simple API token.
	 * @throws Exception
	 *             From {@link #authenticationManager()}
	 */
	@Bean
	public ApiTokenAuthenticationFilter apiTokenFilter() throws Exception {
		final ApiTokenAuthenticationFilter bean = new ApiTokenAuthenticationFilter();
		bean.setPrincipalRequestHeader("SM_UNIVERSALID");
		bean.setCredentialsRequestHeader("X-api-key");
		bean.setExceptionIfHeaderMissing(false);
		bean.setContinueFilterChainOnUnsuccessfulAuthentication(false);
		bean.setAuthenticationManager(authenticationManager());
		return bean;
	}

	@Bean
	public HttpFirewall allowUrlEncodedSlashHttpFirewall() {
		final DefaultHttpFirewall firewall = new DefaultHttpFirewall();
		firewall.setAllowUrlEncodedSlash(true);
		return firewall;
	}

	@Override
	public void configure(WebSecurity web) throws Exception {
		web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
	}
}
