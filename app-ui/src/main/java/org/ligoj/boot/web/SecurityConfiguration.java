/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import java.util.Arrays;
import java.util.HashSet;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.http.security.AbstractAuthenticationProvider;
import org.ligoj.app.http.security.CookieWipingLogoutHandler;
import org.ligoj.app.http.security.DigestAuthenticationFilter;
import org.ligoj.app.http.security.SilentRequestHeaderAuthenticationFilter;
import org.ligoj.app.http.security.SimpleUserDetailsService;
import org.ligoj.bootstrap.http.security.ExtendedSecurityExpressionHandler;
import org.ligoj.bootstrap.http.security.RedirectAuthenticationEntryPoint;
import org.ligoj.bootstrap.http.security.RestRedirectStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.ConcurrentSessionControlAuthenticationStrategy;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionFixationProtectionStrategy;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.session.ConcurrentSessionFilter;
import org.springframework.security.web.session.SimpleRedirectSessionInformationExpiredStrategy;

import lombok.extern.slf4j.Slf4j;

/**
 * Spring Boot security configuration.
 */
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(jsr250Enabled = true, securedEnabled = true, prePostEnabled = true)
@Profile("prod")
@Slf4j
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {

	@Value("${security.max-sessions:1}")
	private int maxSession;

	@Value("${security:Rest}")
	private String securityProvider;

	@Value("${security.pre-auth-principal:}")
	protected String securityPreAuthPrincipal;

	@Value("${security.pre-auth-logout:}")
	protected String securityPreAuthLogout;

	@Value("${security.pre-auth-credentials:}")
	protected String securityPreAuthCredentials;

	@Value("${security.pre-auth-cookies:}")
	protected String[] securityPreAuthCookies;

	@Value("${sso.url}")
	private String ssoUrl;

	@Value("${sso.content}")
	private String ssoContent;

	@Value("${ligoj.endpoint.api.url}")
	private String apiEndpoint;

	@Autowired
	private ExtendedSecurityExpressionHandler expressionHandler;

	/**
	 * A 403 JSON management.
	 *
	 * @return A 403 JSON management.
	 */
	@Bean
	public RedirectAuthenticationEntryPoint ajaxFormLoginEntryPoint() {
		final var ep = new RedirectAuthenticationEntryPoint("/login.html");
		ep.setRedirectUrls(new HashSet<>(Arrays.asList("/", "index.html", "index-prod.html", "login.html", "login-prod.html")));
		ep.setRedirectStrategy(getRestFailureStrategy());
		return ep;
	}

	/**
	 * Configure firewall.
	 * 
	 * @return firewall configuration.
	 */
	@Bean
	public HttpFirewall allowUrlEncodedSlashHttpFirewall() {
		final var firewall = new DefaultHttpFirewall();
		firewall.setAllowUrlEncodedSlash(true);
		return firewall;
	}

	/**
	 * Pre-Authentication provider.
	 *
	 * @return Pre-Authentication provider.
	 * @throws ReflectiveOperationException
	 *             Unable to build the authentication provider
	 */
	@Bean
	public AbstractAuthenticationProvider authenticationProvider() throws ReflectiveOperationException {
		final var provider = (AbstractAuthenticationProvider) Class
				.forName("org.ligoj.app.http.security." + securityProvider + "AuthenticationProvider").getConstructors()[0].newInstance();
		provider.setSsoPostUrl(ssoUrl);
		provider.setSsoPostContent(ssoContent);
		return provider;
	}

	/**
	 * Configure session management filter.
	 * 
	 * @return session management configuration.
	 */
	@Bean
	public ConcurrentSessionFilter concurrentSessionFilter() {
		return new ConcurrentSessionFilter(sessionRegistry(), new SimpleRedirectSessionInformationExpiredStrategy("/login.html?concurrency"));
	}

	@Override
	protected void configure(final HttpSecurity http) throws Exception {
		final var logout = isPreAuth() ? StringUtils.defaultIfBlank(securityPreAuthLogout, "/logout.html") : "/login.html?logout";
		final var sec = http.authorizeRequests().expressionHandler(expressionHandler)
				// Login
				.antMatchers(HttpMethod.POST, "/login").permitAll()

				// Public static resources
				.regexMatchers(HttpMethod.GET, SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PATTERN).permitAll()

				.antMatchers("/rest/redirect", "/rest/security/login", "/captcha.png").permitAll()
				.antMatchers("/rest/service/password/reset/**", "/rest/service/password/recovery/**").anonymous()

				// Everything else is authenticated
				.anyRequest()
				.access("((hasParameter('api-key') or hasHeader('x-api-key')) and (hasParameter('api-user') or hasHeader('x-api-user'))) or isFullyAuthenticated()")
				.and().exceptionHandling().authenticationEntryPoint(ajaxFormLoginEntryPoint()).accessDeniedPage("/login.html?denied").and()

				.logout().addLogoutHandler(new CookieWipingLogoutHandler(securityPreAuthCookies)).invalidateHttpSession(true).logoutSuccessUrl(logout)
				.and()

				.formLogin().loginPage("/login.html?denied").loginProcessingUrl("/login").successHandler(getSuccessHandler())
				.failureHandler(getFailureHandler()).and()

				// Stateful session
				.csrf().disable().sessionManagement().sessionAuthenticationStrategy(sessionAuth()).and().securityContext().and()

				// Security filters
				.addFilterAt(digestAuthenticationFilter(), org.springframework.security.web.authentication.www.DigestAuthenticationFilter.class)
				.addFilterAfter(concurrentSessionFilter(), ConcurrentSessionFilter.class);

		// Activate a pre-auth filter if configured header
		if (isPreAuth()) {
			log.info("Pre-auth filter is enabled with {}/{}, logout: {}", securityPreAuthPrincipal, securityPreAuthCredentials, logout);
			final var bean = new SilentRequestHeaderAuthenticationFilter();
			bean.setPrincipalRequestHeader(securityPreAuthPrincipal);
			bean.setCredentialsRequestHeader(securityPreAuthCredentials);
			bean.setAuthenticationManager(authenticationManager());
			sec.addFilterAt(bean, AbstractPreAuthenticatedProcessingFilter.class);
		}
	}

	private boolean isPreAuth() {
		return StringUtils.isNotBlank(securityPreAuthPrincipal);
	}

	@Override
	public void configure(WebSecurity web) {
		web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
	}

	/**
	 * Configure {@link AuthenticationProvider}
	 *
	 * @param auth
	 *            The builder.
	 * @throws ReflectiveOperationException
	 *             Unable to build the authentication provider
	 */
	@Autowired
	public void configureGlobal(final AuthenticationManagerBuilder auth) throws ReflectiveOperationException {
		auth.eraseCredentials(true).authenticationProvider(authenticationProvider());
	}

	/**
	 * Configure digest based authentication.
	 * 
	 * @return digest based authentication configuration.
	 */
	@Bean
	public DigestAuthenticationFilter digestAuthenticationFilter() {
		final var filter = new DigestAuthenticationFilter();
		filter.setSsoPostUrl(apiEndpoint + "/security/sso");
		final var failureHandler = new SimpleUrlAuthenticationFailureHandler();
		failureHandler.setDefaultFailureUrl("/login.html");
		filter.setAuthenticationFailureHandler(failureHandler);
		final var successHandler = new SimpleUrlAuthenticationSuccessHandler();
		successHandler.setTargetUrlParameter("target");
		filter.setAuthenticationSuccessHandler(successHandler);
		return filter;
	}

	/**
	 * Configure failure URL.
	 * 
	 * @return authentication failure configuration.
	 */
	@Bean
	public SimpleUrlAuthenticationFailureHandler getFailureHandler() {
		final var handler = new SimpleUrlAuthenticationFailureHandler();
		final var strategy = getRestFailureStrategy();
		handler.setRedirectStrategy(strategy);
		handler.setDefaultFailureUrl("/");
		return handler;
	}

	/**
	 * Configure REST failure URL.
	 * 
	 * @return REST failure configuration.
	 */
	@Bean
	public RestRedirectStrategy getRestFailureStrategy() {
		final var strategy = new RestRedirectStrategy();
		strategy.setSuccess(false);
		strategy.setStatus(401);
		return strategy;
	}

	/**
	 * Configure success URL.
	 * 
	 * @return authentication success configuration.
	 */
	@Bean
	public SimpleUrlAuthenticationSuccessHandler getSuccessHandler() {
		final var handler = new SimpleUrlAuthenticationSuccessHandler();
		final var strategy = new RestRedirectStrategy();
		strategy.setSuccess(true);
		handler.setRedirectStrategy(strategy);
		return handler;
	}

	/**
	 * Maximum ONE concurrent session. Previous user is logged out.
	 *
	 * @return Concurrency configuration.
	 */
	@Bean
	public CompositeSessionAuthenticationStrategy sessionAuth() {
		final var registry = sessionRegistry();
		final var sas = new ConcurrentSessionControlAuthenticationStrategy(registry);
		sas.setMaximumSessions(maxSession);
		sas.setExceptionIfMaximumExceeded(false);
		final var sfps = new SessionFixationProtectionStrategy();
		final var rsas = new RegisterSessionAuthenticationStrategy(registry);
		return new CompositeSessionAuthenticationStrategy(Arrays.asList(sas, sfps, rsas));
	}

	/**
	 * Configure session registry.
	 * 
	 * @return session registry configuration.
	 */
	@Bean
	public SessionRegistry sessionRegistry() {
		return new org.springframework.security.core.session.SessionRegistryImpl();
	}

	@Override
	@Bean
	public SimpleUserDetailsService userDetailsServiceBean() {
		return new SimpleUserDetailsService();
	}
}
