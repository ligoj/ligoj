/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import org.ligoj.app.http.proxy.HtmlProxyFilter;
import org.ligoj.app.http.security.CacheBustingFilter;
import org.ligoj.app.http.security.CaptchaFilter;
import org.ligoj.app.http.security.CaptchaServlet;
import org.ligoj.bootstrap.http.proxy.BackendProxyServlet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.ErrorPage;
import org.springframework.boot.web.server.ErrorPageRegistrar;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ImportResource;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.context.AbstractSecurityWebApplicationInitializer;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.context.request.RequestContextListener;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.filter.DelegatingFilterProxy;

import java.util.HashMap;

/**
 * Application entry point.
 */
@SpringBootApplication
@ImportResource("classpath:/META-INF/spring/application.xml")
@EnableAutoConfiguration(exclude={DataSourceAutoConfiguration.class})
public class Application extends SpringBootServletInitializer {

	private static final String SERVICE_RECOVERY = "/rest/service/password/recovery/*";
	private static final String SERVICE_RESET = "/rest/service/password/reset/*";

	@Value("${ligoj.endpoint.manage.url:http://localhost:8081/ligoj-api/manage}")
	private String endpointManagement;

	@Value("${ligoj.endpoint.api.url:http://localhost:8081/ligoj-api/rest}")
	private String endpointApi;

	@Value("${ligoj.endpoint.plugins.url:http://localhost:8081/ligoj-api/webjars}")
	private String endpointPlugin;

	@Value("${app-env:auto}")
	protected String environmentCode;

	/**
	 * The last loaded context.
	 */
	protected static ConfigurableApplicationContext lastContext;

	@Override
	protected SpringApplicationBuilder configure(final SpringApplicationBuilder application) {
		return application.sources(Application.class);
	}

	/**
	 * Require main either invoked from IDE, either from the CLI
	 * 
	 * @param args
	 *            Application arguments.
	 */
	public static void main(final String[] args) {
		lastContext = SpringApplication.run(Application.class, args);
	}

	/**
	 * Configure management servlet.
	 * 
	 * @return management servlet configuration.
	 */
	@Bean
	public ServletRegistrationBean<BackendProxyServlet> managementServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.manage.url", endpointManagement);
		return newBackend("managementProxy", "ligoj.endpoint.manage.url", "/manage", "/manage/*");
	}

	/**
	 * Configure API proxy servlet.
	 * 
	 * @return API proxy servlet configuration.
	 */
	@Bean
	public ServletRegistrationBean<BackendProxyServlet> apiProxyServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.api.url", endpointApi);
		return newBackend("apiProxy", "ligoj.endpoint.api.url", "/rest", "/rest/*");
	}

	/**
	 * Configure plugin proxy servlet.
	 * 
	 * @return plugin servlet configuration.
	 */
	@Bean
	public ServletRegistrationBean<BackendProxyServlet> pluginProxyServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.plugins.url", endpointPlugin);
		return newBackend("pluginProxy", "ligoj.endpoint.plugins.url", "/main", "/main/*");
	}

	/**
	 * Create a new {@link BackendProxyServlet} servlet.
	 * 
	 * @param name
	 *            The servlet name.
	 * @param proxyToKey
	 *            The end-point system property.
	 * @param prefix
	 *            The servlet prefix.
	 * @param mapping
	 *            The servlet mapping URL.
	 * @return {@link ServletRegistrationBean} with a new registered {@link BackendProxyServlet}.
	 */
	private ServletRegistrationBean<BackendProxyServlet> newBackend(final String name, final String proxyToKey, final String prefix,
			final String... mapping) {
		final var initParameters = new HashMap<String, String>();
		initParameters.put("proxyToKey", proxyToKey);
		initParameters.put("prefix", prefix);
		initParameters.put("idleTimeout", "120000");
		initParameters.put("maxThreads", "50");
		initParameters.put("timeout", "0");
		initParameters.put("apiKeyParameter", "api-key");
		initParameters.put("apiKeyHeader", "x-api-key");
		final var registrationBean = new ServletRegistrationBean<>(new BackendProxyServlet(), mapping);
		registrationBean.setInitParameters(initParameters);
		registrationBean.setName(name);
		return registrationBean;
	}

	/**
	 * Configure captcha servlet.
	 * 
	 * @return captcha configuration.
	 */
	@Bean
	public ServletRegistrationBean<CaptchaServlet> captchaServlet() {
		return new ServletRegistrationBean<>(new CaptchaServlet(), "/captcha.png");
	}

	/**
	 * Configure security filter.
	 * 
	 * @return security filter configuration.
	 */
	@Bean
	public FilterRegistrationBean<DelegatingFilterProxy> securityFilterChainRegistration() {
		final var filter = new DelegatingFilterProxy();
		filter.setTargetBeanName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		final var registrationBean = new FilterRegistrationBean<>(filter);
		registrationBean.setName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		registrationBean.addUrlPatterns("/*");
		registrationBean.setOrder(1);
		return registrationBean;
	}

	/**
	 * Configure charset filter.
	 * 
	 * @return charset filter configuration.
	 */
	@Bean
	public FilterRegistrationBean<CharacterEncodingFilter> characterEncodingFilter() {
		final var registrationBean = new FilterRegistrationBean<>(new CharacterEncodingFilter());
		registrationBean.addUrlPatterns("*.html", "*.js", "/");
		final var initParameters = new HashMap<String, String>();
		initParameters.put("encoding", "UTF-8");
		registrationBean.setInitParameters(initParameters);
		registrationBean.setOrder(5);
		return registrationBean;
	}

	/**
	 * Configure html proxy filter.
	 * 
	 * @return html proxy filter configuration.
	 */
	@Bean
	public FilterRegistrationBean<HtmlProxyFilter> htmlProxyFilter() {
		final var proxyFilter = new HtmlProxyFilter();
		proxyFilter.setSuffix(getEnvironment());
		final var registrationBean = new FilterRegistrationBean<>(proxyFilter);
		registrationBean.addUrlPatterns("/index.html", "/", "/login.html");
		registrationBean.setOrder(10);
		return registrationBean;
	}

	/**
	 * Configure cache filter.
	 * 
	 * @return cache filter configuration.
	 */
	@Bean
	public FilterRegistrationBean<CacheBustingFilter> cacheFilter() {
		final var registrationBean = new FilterRegistrationBean<>(new CacheBustingFilter(31556926));
		registrationBean.addUrlPatterns("/dist/*", "/img/*", "/main/*", "/themes/*", "/favicon.ico");
		registrationBean.setOrder(15);
		return registrationBean;
	}

	/**
	 * Configure CAPTCHA filter.
	 * 
	 * @return CAPTCHA filter configuration.
	 */
	@Bean
	public FilterRegistrationBean<CaptchaFilter> captchaFilter() {
		final var registrationBean = new FilterRegistrationBean<>(new CaptchaFilter());
		registrationBean.addUrlPatterns(SERVICE_RESET, SERVICE_RECOVERY);
		registrationBean.setOrder(100);
		return registrationBean;
	}

	/**
	 * Fix the system environment from "auto" to the guess value.
	 * 
	 * @return The computed web environment.
	 */
	protected String getEnvironment() {
		// Auto detect environment variable
		if ("auto".equals(environmentCode)) {
			if (System.getProperty("java.class.path", "").contains(".war")) {
				return "-prod";
			}
			return "";
		}
		// Export to same property
		return environmentCode;
	}

	/**
	 * Configure request context listener.
	 * 
	 * @return request context listener configuration.
	 */
	@Bean
	public RequestContextListener requestContextListener() {
		return new RequestContextListener();
	}

	/**
	 * Configure session manager.
	 * 
	 * @return session manager configuration.
	 */
	@Bean
	public HttpSessionEventPublisher httpSessionEventPublisher() {
		return new HttpSessionEventPublisher();
	}

	/**
	 * Configure error mapper.
	 * 
	 * @return error mapper configuration.
	 */
	@Bean
	public ErrorPageRegistrar containerCustomizer() {
		return registry -> registry.addErrorPages(new ErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "/500.html"),
				new ErrorPage(HttpStatus.UNAUTHORIZED, "/403.html"), new ErrorPage(HttpStatus.FORBIDDEN, "/403.html"),
				new ErrorPage(HttpStatus.NOT_FOUND, "/404.html"), new ErrorPage(HttpStatus.METHOD_NOT_ALLOWED, "/404.html"),
				new ErrorPage(HttpStatus.SERVICE_UNAVAILABLE, "/503.html"));
	}
}
