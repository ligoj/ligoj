/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import java.util.Collections;

import org.apache.cxf.transport.servlet.CXFServlet;
import org.ligoj.app.resource.plugin.WebjarsServlet;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.actuate.autoconfigure.metrics.jdbc.DataSourcePoolMetricsAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.ldap.LdapAutoConfiguration;
import org.springframework.boot.autoconfigure.ldap.embedded.EmbeddedLdapAutoConfiguration;
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
import org.springframework.web.filter.DelegatingFilterProxy;

/**
 * Spring boot application entry point.
 */
@SpringBootApplication(exclude = { LdapAutoConfiguration.class, EmbeddedLdapAutoConfiguration.class, DataSourcePoolMetricsAutoConfiguration.class })
@ImportResource("classpath:/META-INF/spring/application-context.xml")
public class Application extends SpringBootServletInitializer {

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

	/**
	 * Plug-in resource servlet.
	 *
	 * @return ServletRegistrationBean
	 */
	@Bean
	public ServletRegistrationBean<WebjarsServlet> webjarsServlet() {
		final ServletRegistrationBean<WebjarsServlet> registrationBean = new ServletRegistrationBean<>(new WebjarsServlet(), "/webjars/*");
		registrationBean.setName("Webjars");
		return registrationBean;
	}

	/**
	 * CXF servlet.
	 *
	 * @return ServletRegistrationBean
	 */
	@Bean
	public ServletRegistrationBean<CXFServlet> cxfServlet() {
		final ServletRegistrationBean<CXFServlet> registrationBean = new ServletRegistrationBean<>(new CXFServlet(), "/rest/*");
		registrationBean.setName("CXFServlet");
		registrationBean.setInitParameters(Collections.singletonMap("service-list-path", "web-services"));
		registrationBean.setOrder(10);
		return registrationBean;
	}

	/**
	 * Spring-Security filter
	 *
	 * @return FilterRegistrationBean
	 */
	@Bean
	public FilterRegistrationBean<DelegatingFilterProxy> securityFilterChainRegistration() {
		final DelegatingFilterProxy delegatingFilterProxy = new DelegatingFilterProxy();
		delegatingFilterProxy.setTargetBeanName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		final FilterRegistrationBean<DelegatingFilterProxy> registrationBean = new FilterRegistrationBean<>(delegatingFilterProxy);
		registrationBean.setName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		registrationBean.addUrlPatterns("/rest/*", "/manage/*");
		return registrationBean;
	}

	/**
	 * Request Context holder.
	 *
	 * @return RequestContextListener
	 */
	@Bean
	public RequestContextListener requestContextListener() {
		return new RequestContextListener();
	}

	/**
	 * @return HttpSessionEventPublisher
	 */
	@Bean
	public HttpSessionEventPublisher httpSessionEventPublisher() {
		return new HttpSessionEventPublisher();
	}

	/**
	 * Error management
	 *
	 * @return ErrorPageRegistrar
	 */
	@Bean
	public ErrorPageRegistrar errorPageRegistrar() {
		return registry -> registry.addErrorPages(new ErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "/500.html"));
	}
}
