package org.ligoj.boot.api;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.transaction.Transactional;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.ErrorPageRegistry;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.util.StringUtils;

/**
 * Test class of {@link Application}
 */
@RunWith(SpringRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Transactional
@SpringBootTest
@Rollback
public class ApplicationTest extends SpringBootServletInitializer {

	@Test
	public void configClassContext() throws Exception {
		getArgs(getClass().getName());
		
		// Need spring boot profiles to complete the test coverage
		// Application.main(getArgs(getClass().getName()))
	}

	@Test
	public void configure() throws Exception {
		new Application().configure(Mockito.mock(SpringApplicationBuilder.class));
		new Application().webjarsServlet();
		new Application().cxfServlet();
		new Application().securityFilterChainRegistration();
		new Application().requestContextListener();
		new Application().httpSessionEventPublisher();
		new Application().errorPageRegistrar().registerErrorPages(Mockito.mock(ErrorPageRegistry.class));
	}

	private String[] getArgs(String... args) {
		List<String> list = new ArrayList<>(
				Arrays.asList("--spring.main.webEnvironment=false", "--spring.main.showBanner=OFF", "--spring.main.registerShutdownHook=false"));
		if (args.length > 0) {
			list.add("--spring.main.sources=" + StringUtils.arrayToCommaDelimitedString(args));
		}
		return list.toArray(new String[list.size()]);
	}

}
