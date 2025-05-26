/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.http.security.AbstractAuthenticationProvider;
import org.ligoj.app.http.security.DigestAuthenticationFilter;
import org.ligoj.app.http.security.SilentRequestHeaderAuthenticationFilter;
import org.ligoj.app.http.security.SimpleUserDetailsService;
import org.ligoj.bootstrap.http.security.ExtendedWebSecurityExpressionHandler;
import org.ligoj.bootstrap.http.security.RedirectAuthenticationEntryPoint;
import org.ligoj.bootstrap.http.security.RestRedirectStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
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
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;

import java.util.Arrays;
import java.util.Set;

/**
 * Spring Boot security configuration.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(jsr250Enabled = true, securedEnabled = true)
@Profile("prod")
@Slf4j
public class SecurityConfiguration {

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

	@Value("${ligoj.sso.url}")
	private String ssoUrl;

	@Value("${ligoj.sso.content}")
	private String ssoContent;

	@Value("${ligoj.endpoint.api.url}")
	private String apiEndpoint;

	@Value("${ligoj.security.login.url:/login.html}")
	private String loginUrl;

	@Autowired
	private ApplicationContext applicationContext;

	static final String LOGIN_API = "/login";
	static final String LOGOUT_HTML = "/logout.html";
	static final String INDEX_HTML = "/index.html";

	/**
	 * A 403 JSON management.
	 *
	 * @return A 403 JSON management.
	 */
	@Bean
	public RedirectAuthenticationEntryPoint ajaxFormLoginEntryPoint(AbstractAuthenticationProvider provider) {
		final var ep = new RedirectAuthenticationEntryPoint(loginUrl);
		ep.setRedirectUrls(Set.of("/", "", INDEX_HTML, "/index-prod.html", "/login.html", "/login-prd.html"));
		ep.setRedirectStrategy(getRestFailureStrategy());
		ep.setForceRedirectUrl(provider.isForceRedirect());
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
	 * @throws ReflectiveOperationException Unable to build the authentication provider
	 */
	@Bean
	public AbstractAuthenticationProvider authenticationProvider() throws ReflectiveOperationException {
		final var provider = (AbstractAuthenticationProvider) Class
				.forName("org.ligoj.app.http.security." + securityProvider + "AuthenticationProvider").getConstructors()[0].newInstance();
		applicationContext.getAutowireCapableBeanFactory().autowireBean(provider);
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
		return new ConcurrentSessionFilter(sessionRegistry(), new SimpleRedirectSessionInformationExpiredStrategy(loginUrl + "?concurrency"));
	}

	/**
	 * Filter security chain
	 *
	 * @param http                 HTTP security bean.
	 * @param expressionWebHandler Custom expression handler.
	 * @return The built bean.
	 * @throws Exception from the build.
	 */
	@Bean
	public SecurityFilterChain filterChain(final HttpSecurity http,
			final ExtendedWebSecurityExpressionHandler expressionWebHandler) throws Exception {
		final var logoutUrl = isPreAuth() ? StringUtils.defaultIfBlank(securityPreAuthLogout, LOGOUT_HTML) : loginUrl + "?logout";
		SilentRequestHeaderAuthenticationFilter preAuthBean = null;
		final var provider = authenticationProvider();
		final var authorization = new WebExpressionAuthorizationManager("((hasParameter('api-key') or hasHeader('x-api-key')) and (hasParameter('api-user') or hasHeader('x-api-user'))) or isFullyAuthenticated()");
		authorization.setExpressionHandler(expressionWebHandler);

		http.authorizeHttpRequests(authorize -> authorize
				.requestMatchers(
						// Login
						AntPathRequestMatcher.antMatcher(HttpMethod.POST, LOGIN_API),
						// Public static resources
						RegexRequestMatcher.regexMatcher(HttpMethod.GET, SilentRequestHeaderAuthenticationFilter.WHITE_LIST_PATTERN.pattern()),
						AntPathRequestMatcher.antMatcher("/rest/redirect"),
						AntPathRequestMatcher.antMatcher("/rest/security/login"),
						AntPathRequestMatcher.antMatcher("/captcha.png")).permitAll()
				.requestMatchers(
						AntPathRequestMatcher.antMatcher("/rest/service/password/reset/**"),
						AntPathRequestMatcher.antMatcher("/rest/service/password/recovery/**")).anonymous()

				// Everything else must be authenticated
				.anyRequest()
				.access(authorization)
		);

		final var loginDeniedUrl = loginUrl + "?denied";
		http.exceptionHandling(a -> a.authenticationEntryPoint(ajaxFormLoginEntryPoint(provider)).accessDeniedPage(loginDeniedUrl));
		provider.configureLogout(http, logoutUrl, securityPreAuthCookies);

		final var loginSuccessHandler = getSuccessHandler();
		final var loginFailureHandler = getFailureHandler();
		provider.configureLogin(http, loginDeniedUrl, LOGIN_API, loginSuccessHandler, loginFailureHandler);

		// Stateful session
		http.csrf(AbstractHttpConfigurer::disable);
		http.sessionManagement(a -> a.sessionAuthenticationStrategy(sessionAuth()));
		http.securityContext(Customizer.withDefaults());

		// Security filters
		http.addFilterAt(digestAuthenticationFilter(), org.springframework.security.web.authentication.www.DigestAuthenticationFilter.class);
		http.addFilterAfter(concurrentSessionFilter(), ConcurrentSessionFilter.class);

		// Activate a pre-auth filter if configured header
		if (isPreAuth()) {
			log.info("Pre-auth filter is enabled with {}/{}, logout: {}", securityPreAuthPrincipal, securityPreAuthCredentials, logoutUrl);
			preAuthBean = new SilentRequestHeaderAuthenticationFilter();
			preAuthBean.setPrincipalRequestHeader(securityPreAuthPrincipal);
			preAuthBean.setCredentialsRequestHeader(securityPreAuthCredentials);
			http.addFilterAt(preAuthBean, AbstractPreAuthenticatedProcessingFilter.class);
		}
		final var chain = http.build();
		if (preAuthBean != null) {
			var authenticationManager = http.getSharedObject(AuthenticationManager.class);
			preAuthBean.setAuthenticationManager(authenticationManager);
		}
		return chain;
	}

	private boolean isPreAuth() {
		return StringUtils.isNotBlank(securityPreAuthPrincipal);
	}

	/**
	 * Return {@link WebSecurityCustomizer} bean
	 *
	 * @return {@link WebSecurityCustomizer} bean.
	 */
	@Bean
	public WebSecurityCustomizer webSecurityCustomizer() {
		return web -> web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
	}

	/**
	 * Configure {@link AuthenticationProvider}
	 *
	 * @param auth The builder.
	 */
	@Autowired
	public void configureGlobal(final AuthenticationManagerBuilder auth, AbstractAuthenticationProvider provider) {
		auth.eraseCredentials(true).authenticationProvider(provider);
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
		failureHandler.setDefaultFailureUrl(loginUrl);
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
		final var concurrentStrategy = new ConcurrentSessionControlAuthenticationStrategy(registry);
		concurrentStrategy.setMaximumSessions(maxSession);
		concurrentStrategy.setExceptionIfMaximumExceeded(false);
		final var fixStrategy = new SessionFixationProtectionStrategy();
		final var registerStrategy = new RegisterSessionAuthenticationStrategy(registry);
		return new CompositeSessionAuthenticationStrategy(Arrays.asList(concurrentStrategy, fixStrategy, registerStrategy));
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

	/**
	 * Return user details bean.
	 *
	 * @return user details bean.
	 */
	@Bean
	public SimpleUserDetailsService userDetailsServiceBean() {
		return new SimpleUserDetailsService();
	}
}
