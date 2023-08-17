/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.ErrorPageRegistry;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/**
 * Test class of {@link Application}
 */
class ApplicationTest extends SpringBootServletInitializer {

	@Test
	void configure() {
		new Application().configure(Mockito.mock(SpringApplicationBuilder.class));
		Assertions.assertNotNull(new Application().webjarsServlet());
		new Application().cxfServlet();
		new Application().securityFilterChainRegistration();
		new Application().requestContextListener();
		new Application().httpSessionEventPublisher();
		new Application().errorPageRegistrar().registerErrorPages(Mockito.mock(ErrorPageRegistry.class));
	}

}
