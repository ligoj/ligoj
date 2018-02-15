package org.ligoj.boot.web;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.jetty.servlets.DoSFilter;
import org.ligoj.app.http.proxy.HtmlProxyFilter;
import org.ligoj.app.http.security.CaptchaFilter;
import org.ligoj.app.http.security.CaptchaServlet;
import org.ligoj.bootstrap.http.proxy.BackendProxyServlet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.SecurityAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.ErrorPage;
import org.springframework.boot.web.server.ErrorPageRegistrar;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ImportResource;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.context.AbstractSecurityWebApplicationInitializer;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.context.request.RequestContextListener;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.filter.DelegatingFilterProxy;

import com.samaxes.filter.CacheFilter;

/**
 * Application entry point.
 */
@SpringBootApplication
@ImportResource("classpath:/META-INF/spring/application.xml")
@EnableAutoConfiguration(exclude = { SecurityAutoConfiguration.class })
public class Application extends SpringBootServletInitializer {

	private static final String SERVICE_PASSWORD_RECOVERY = "/rest/service/password/recovery/*";
	private static final String SERVICE_PASSWORD_RESET = "/rest/service/password/reset/*";

	@Value("${ligoj.endpoint.manage.url:http://localhost:8081/ligoj-api/manage}")
	private String endpointManagement;

	@Value("${ligoj.endpoint.api.url:http://localhost:8081/ligoj-api/rest}")
	private String endpointApi;

	@Value("${ligoj.endpoint.plugins.url:http://localhost:8081/ligoj-api/webjars}")
	private String endpointPlugin;

	@Value("${app-env:auto}")
	protected String environmentCode;

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
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public ServletRegistrationBean<BackendProxyServlet> managementServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.manage.url", endpointManagement);
		return newBackend("managementProxy", "ligoj.endpoint.manage.url", "/manage", "/manage/*");
	}

	@Bean
	public ServletRegistrationBean<BackendProxyServlet> apiProxyServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.api.url", endpointApi);
		return newBackend("apiProxy", "ligoj.endpoint.api.url", "/rest", "/rest/*");
	}

	@Bean
	public ServletRegistrationBean<BackendProxyServlet> pluginProxyServlet() {
		// Due to the current limitation of BackendProxyServlet
		System.setProperty("ligoj.endpoint.plugins.url", endpointPlugin);
		return newBackend("pluginProxy", "ligoj.endpoint.plugins.url", "/main", "/main/service/*", "/main/id/*", "/main/prov/*", "/main/inbox/*");
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
	private ServletRegistrationBean<BackendProxyServlet> newBackend(final String name, final String proxyToKey, final String prefix, final String... mapping) {
		final Map<String, String> initParameters = new HashMap<>();
		initParameters.put("proxyToKey", proxyToKey);
		initParameters.put("prefix", prefix);
		initParameters.put("idleTimeout", "120000");
		initParameters.put("maxThreads", "50");
		initParameters.put("timeout", "0");
		initParameters.put("apiKeyParameter", "api-key");
		initParameters.put("apiKeyHeader", "x-api-key");
		final ServletRegistrationBean<BackendProxyServlet> registrationBean = new ServletRegistrationBean<>(new BackendProxyServlet(), mapping);
		registrationBean.setInitParameters(initParameters);
		registrationBean.setName(name);
		return registrationBean;
	}

	@Bean
	public ServletRegistrationBean<CaptchaServlet> captchaServlet() {
		return new ServletRegistrationBean<>(new CaptchaServlet(), "/captcha.png");
	}

	@Bean
	public FilterRegistrationBean<DelegatingFilterProxy> securityFilterChainRegistration() {
		final DelegatingFilterProxy filter = new DelegatingFilterProxy();
		filter.setTargetBeanName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		final FilterRegistrationBean<DelegatingFilterProxy> registrationBean = new FilterRegistrationBean<>(filter);
		registrationBean.setName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		registrationBean.addUrlPatterns("/*");
		registrationBean.setOrder(1);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean<CharacterEncodingFilter> characterEncodingFilter() {
		final FilterRegistrationBean<CharacterEncodingFilter> registrationBean = new FilterRegistrationBean<>(new CharacterEncodingFilter());
		registrationBean.addUrlPatterns("*.html", "*.js", "/");
		final Map<String, String> initParameters = new HashMap<>();
		initParameters.put("encoding", "UTF-8");
		registrationBean.setInitParameters(initParameters);
		registrationBean.setOrder(5);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean<HtmlProxyFilter> htmlProxyFilter() {
		final HtmlProxyFilter proxyFilter = new HtmlProxyFilter();
		proxyFilter.setSuffix(getEnvironment());
		final FilterRegistrationBean<HtmlProxyFilter> registrationBean = new FilterRegistrationBean<>(proxyFilter);
		registrationBean.addUrlPatterns("/index.html", "/", "/login.html");
		registrationBean.setOrder(10);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean<CacheFilter> cacheFilter() {
		final FilterRegistrationBean<CacheFilter> registrationBean = new FilterRegistrationBean<>(new CacheFilter());
		registrationBean.addUrlPatterns("/dist/*", "/img/*", "/main/*", "/themes/*");
		final Map<String, String> initParameters = new HashMap<>();
		initParameters.put("privacy", "public");
		initParameters.put("static", "true");
		initParameters.put("expiration", "31556926");
		registrationBean.setInitParameters(initParameters);
		registrationBean.setOrder(15);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean<DoSFilter> doSFilter() {
		final FilterRegistrationBean<DoSFilter> registrationBean = new FilterRegistrationBean<>(new DoSFilter());
		registrationBean.addUrlPatterns(SERVICE_PASSWORD_RESET, SERVICE_PASSWORD_RECOVERY, "/captcha.png");
		final Map<String, String> initParameters = new HashMap<>();
		initParameters.put("maxRequestsPerSec", "6");
		initParameters.put("delayMs", "-1");
		initParameters.put("maxWaitMs", "1");
		initParameters.put("throttledRequests", "6");
		initParameters.put("throttleMs", "1000");
		initParameters.put("maxRequestMs", "2000");
		initParameters.put("maxIdleTrackerMs", "5000");
		initParameters.put("trackSessions", "true");
		registrationBean.setInitParameters(initParameters);
		registrationBean.setOrder(20);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean<CaptchaFilter> captchaFilter() {
		final FilterRegistrationBean<CaptchaFilter> registrationBean = new FilterRegistrationBean<>(new CaptchaFilter());
		registrationBean.addUrlPatterns(SERVICE_PASSWORD_RESET, SERVICE_PASSWORD_RECOVERY);
		registrationBean.setOrder(100);
		return registrationBean;
	}

	/**
	 * Fix the system environment from "auto" to the guess value.
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

	@Bean
	public RequestContextListener requestContextListener() {
		return new RequestContextListener();
	}

	@Bean
	public HttpSessionEventPublisher httpSessionEventPublisher() {
		return new HttpSessionEventPublisher();
	}

	@Bean
	public ErrorPageRegistrar containerCustomizer() {
		return registry -> registry.addErrorPages(new ErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "/500.html"),
				new ErrorPage(HttpStatus.UNAUTHORIZED, "/403.html"), new ErrorPage(HttpStatus.FORBIDDEN, "/403.html"),
				new ErrorPage(HttpStatus.NOT_FOUND, "/404.html"), new ErrorPage(HttpStatus.METHOD_NOT_ALLOWED, "/404.html"),
				new ErrorPage(HttpStatus.SERVICE_UNAVAILABLE, "/503.html"));
	}
}
