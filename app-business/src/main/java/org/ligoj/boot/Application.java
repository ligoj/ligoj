package org.ligoj.boot;

import java.util.Collections;

import org.apache.cxf.transport.servlet.CXFServlet;
import org.ligoj.app.resource.plugin.WebjarsServlet;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.embedded.ConfigurableEmbeddedServletContainer;
import org.springframework.boot.context.embedded.EmbeddedServletContainerCustomizer;
import org.springframework.boot.web.servlet.ErrorPage;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.boot.web.support.SpringBootServletInitializer;
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
@SpringBootApplication
@ImportResource("classpath:/META-INF/spring/application-context.xml")
public class Application extends SpringBootServletInitializer {

	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		return application.sources(Application.class);
	}

	/**
	 * Require main either invoked from IDE, either from the CLI
	 * 
	 * @param args
	 *            Application arguments.
	 */
	public static void main(String[] args) throws Exception {
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public ServletRegistrationBean webjarsServlet() {
		final ServletRegistrationBean registrationBean = new ServletRegistrationBean(new WebjarsServlet(), "/webjars/*");
		registrationBean.setName("Webjars");
		return registrationBean;
	}

	@Bean
	public ServletRegistrationBean cxfServlet() {
		final ServletRegistrationBean registrationBean = new ServletRegistrationBean(new CXFServlet(), "/rest/*");
		registrationBean.setName("CXFServlet");
		registrationBean.setInitParameters(Collections.singletonMap("service-list-path", "web-services"));
		registrationBean.setOrder(10);
		return registrationBean;
	}

	@Bean
	public FilterRegistrationBean securityFilterChainRegistration() {
		DelegatingFilterProxy delegatingFilterProxy = new DelegatingFilterProxy();
		delegatingFilterProxy.setTargetBeanName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		FilterRegistrationBean registrationBean = new FilterRegistrationBean(delegatingFilterProxy);
		registrationBean.setName(AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME);
		registrationBean.addUrlPatterns("/rest/*", "/manage/*");
		return registrationBean;
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
	public EmbeddedServletContainerCustomizer containerCustomizer() {
		return new EmbeddedServletContainerCustomizer() {
			@Override
			public void customize(ConfigurableEmbeddedServletContainer container) {
				container.addErrorPages(new ErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "/500.html"));
			}
		};
	}

}
