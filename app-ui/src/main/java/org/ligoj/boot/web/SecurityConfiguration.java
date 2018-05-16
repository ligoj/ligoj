/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import java.util.Arrays;
import java.util.HashSet;

import org.ligoj.app.http.security.AbstractAuthenticationProvider;
import org.ligoj.app.http.security.DigestAuthenticationFilter;
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
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.ConcurrentSessionControlAuthenticationStrategy;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionFixationProtectionStrategy;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.session.ConcurrentSessionFilter;
import org.springframework.security.web.session.SimpleRedirectSessionInformationExpiredStrategy;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(jsr250Enabled = true, securedEnabled = true, prePostEnabled = true)
@Profile("prod")
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {

	@Value("${security.max-sessions:1}")
	private int maxSession;

	@Value("${security:Rest}")
	private String security;

	@Value("${sso.url}")
	private String ssoUrl;

	@Value("${sso.content}")
	private String ssoContent;

	@Value("${ligoj.endpoint.api.url}")
	private String apiEndpoint;

	@Autowired
	private ExtendedSecurityExpressionHandler expressionHandler;

	@Override
	protected void configure(final HttpSecurity http) throws Exception {
		http.authorizeRequests().expressionHandler(expressionHandler)
				// Login
				.antMatchers(HttpMethod.POST, "/login").permitAll()

				// Public static resources
				.regexMatchers(HttpMethod.GET, "/(\\d+|themes|lib|dist|login|main/public).*").permitAll()

				.antMatchers("/rest/redirect", "/rest/security/login", "/captcha.png").permitAll().antMatchers("/rest/security/login").anonymous()
				.antMatchers("/rest/service/password/reset/**", "/rest/service/password/recovery/**").anonymous()

				// Everything else is authenticated
				.anyRequest().access("hasParameter('api-key') or hasHeader('x-api-key') or isFullyAuthenticated()").and().exceptionHandling()
				.authenticationEntryPoint(ajaxFormLoginEntryPoint()).accessDeniedPage("/login.html?denied").and()

				.logout().invalidateHttpSession(true).logoutSuccessUrl("/login.html?logout").and()

				.formLogin().loginPage("/login.html?denied").loginProcessingUrl("/login").successHandler(getSuccessHandler())
				.failureHandler(getFailureHandler()).and()

				// Stateful session
				.csrf().disable().sessionManagement().sessionAuthenticationStrategy(sessionAuth()).and().securityContext().and()

				// Security filters
				.addFilterAt(digestAuthenticationFilter(), org.springframework.security.web.authentication.www.DigestAuthenticationFilter.class)
				.addFilterAfter(concurrentSessionFilter(), ConcurrentSessionFilter.class);
	}

	@Bean
	public ConcurrentSessionFilter concurrentSessionFilter() {
		return new ConcurrentSessionFilter(sessionRegistry(), new SimpleRedirectSessionInformationExpiredStrategy("/login.html?concurrency"));
	}

	@Bean
	public DigestAuthenticationFilter digestAuthenticationFilter() {
		final DigestAuthenticationFilter filter = new DigestAuthenticationFilter();
		filter.setSsoPostUrl(apiEndpoint + "/security/sso");
		final SimpleUrlAuthenticationFailureHandler failureHandler = new SimpleUrlAuthenticationFailureHandler();
		failureHandler.setDefaultFailureUrl("/login.html");
		filter.setAuthenticationFailureHandler(failureHandler);
		final SimpleUrlAuthenticationSuccessHandler successHandler = new SimpleUrlAuthenticationSuccessHandler();
		successHandler.setTargetUrlParameter("target");
		filter.setAuthenticationSuccessHandler(successHandler);
		return filter;
	}

	@Bean
	public SimpleUrlAuthenticationFailureHandler getFailureHandler() {
		final SimpleUrlAuthenticationFailureHandler handler = new SimpleUrlAuthenticationFailureHandler();
		final RestRedirectStrategy strategy = getRestFailureStrategy();
		handler.setRedirectStrategy(strategy);
		handler.setDefaultFailureUrl("/");
		return handler;
	}

	@Bean
	public RestRedirectStrategy getRestFailureStrategy() {
		final RestRedirectStrategy strategy = new RestRedirectStrategy();
		strategy.setSuccess(false);
		strategy.setStatus(401);
		return strategy;
	}

	@Bean
	public SimpleUrlAuthenticationSuccessHandler getSuccessHandler() {
		final SimpleUrlAuthenticationSuccessHandler handler = new SimpleUrlAuthenticationSuccessHandler();
		final RestRedirectStrategy strategy = new RestRedirectStrategy();
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
		final SessionRegistry registry = sessionRegistry();
		final ConcurrentSessionControlAuthenticationStrategy sas = new ConcurrentSessionControlAuthenticationStrategy(registry);
		sas.setMaximumSessions(maxSession);
		sas.setExceptionIfMaximumExceeded(false);
		final SessionFixationProtectionStrategy sfps = new SessionFixationProtectionStrategy();
		final RegisterSessionAuthenticationStrategy rsas = new RegisterSessionAuthenticationStrategy(registry);
		return new CompositeSessionAuthenticationStrategy(Arrays.asList(sas, sfps, rsas));
	}

	@Bean
	public SessionRegistry sessionRegistry() {
		return new org.springframework.security.core.session.SessionRegistryImpl();
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
	 * A 403 JSON management.
	 *
	 * @return A 403 JSON management.
	 */
	@Bean
	public RedirectAuthenticationEntryPoint ajaxFormLoginEntryPoint() {
		final RedirectAuthenticationEntryPoint ep = new RedirectAuthenticationEntryPoint("/login.html");
		ep.setRedirectUrls(new HashSet<>(Arrays.asList("/", "index.html", "index-prod.html", "login.html", "login-prod.html")));
		ep.setRedirectStrategy(getRestFailureStrategy());
		return ep;
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
		final AbstractAuthenticationProvider provider = (AbstractAuthenticationProvider) Class
				.forName("org.ligoj.app.http.security." + security + "AuthenticationProvider").getConstructors()[0].newInstance();
		provider.setSsoPostUrl(ssoUrl);
		provider.setSsoPostContent(ssoContent);
		return provider;
	}

	@Override
	@Bean
	public SimpleUserDetailsService userDetailsServiceBean() {
		return new SimpleUserDetailsService();
	}

	@Bean
	public HttpFirewall allowUrlEncodedSlashHttpFirewall() {
		final DefaultHttpFirewall firewall = new DefaultHttpFirewall();
		firewall.setAllowUrlEncodedSlash(true);
		return firewall;
	}

	@Override
	public void configure(WebSecurity web) {
		web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
	}
}
