/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.error.ErrorPageRegistry;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

import static org.mockito.Mockito.mock;

/**
 * Test class of {@link Application}
 */
class ApplicationTest extends SpringBootServletInitializer {

	@Test
	void configure() {
		new Application().configure(mock(SpringApplicationBuilder.class));
		Assertions.assertNotNull(new Application().webjarsServlet());
		new Application().cxfServlet();
		new Application().securityFilterChainRegistration();
		new Application().requestContextListener();
		new Application().httpSessionEventPublisher();
		new Application().errorPageRegistrar().registerErrorPages(mock(ErrorPageRegistry.class));
	}

}
