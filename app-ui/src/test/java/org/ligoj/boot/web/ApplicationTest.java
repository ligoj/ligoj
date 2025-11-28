/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.ErrorPageRegistry;
import org.springframework.util.StringUtils;

/**
 * Test class of {@link Application}
 */
class ApplicationTest {

	private static final String OLD_CLASSPATH = System.getProperty("java.class.path");

	@AfterAll
	static void resetTestEnv() {
		System.clearProperty("app-env");
		System.clearProperty("security.pre-auth-principal");
		System.clearProperty("security.pre-auth-credentials");
		System.clearProperty("security.pre-auth-logout");
		if (OLD_CLASSPATH == null) {
			System.clearProperty("java.class.path");
		} else {
			System.setProperty("java.class.path", OLD_CLASSPATH);
		}
	}

	@Test
	void configClassContext() {
		Application.main(getArgs(getClass().getName()));
		Assertions.assertEquals(0, SpringApplication.exit(Application.lastContext));
	}

	@Test
	void configure() {
		final var builder = Mockito.mock(SpringApplicationBuilder.class);
		new Application().configure(builder);
		Mockito.verify(builder).sources(Application.class);
		new Application().containerCustomizer().registerErrorPages(Mockito.mock(ErrorPageRegistry.class));
	}

	@Test
	void configurePreAuthHeader() {
		System.setProperty("security.pre-auth-principal", "HEADER");
		System.setProperty("security.pre-auth-credentials", "CREDENTIALS");
		Application.main(getArgs(getClass().getName()));
		Assertions.assertEquals(0, SpringApplication.exit(Application.lastContext));
	}

	@Test
	void configurePreAuthLogout() {
		System.setProperty("security.pre-auth-principal", "HEADER");
		System.setProperty("security.pre-auth-credentials", "CREDENTIALS");
		System.setProperty("security.pre-auth-logout", "https://signin.sample.com");
		Application.main(getArgs(getClass().getName()));
		Assertions.assertEquals(0, SpringApplication.exit(Application.lastContext));
	}

	@Test
	void getEnvironment() {
		final var application = new Application();
		application.environmentCode = "auto";
		Assertions.assertEquals("", application.getEnvironment());
		application.environmentCode = "any";
		Assertions.assertEquals("any", application.getEnvironment());
		application.environmentCode = "auto";
		System.setProperty("java.class.path", "any.war");
		Assertions.assertEquals("-prod", application.getEnvironment());
	}

	protected String[] getArgs(String... args) {
		return new String[] { "--spring.main.webEnvironment=false", "--spring.main.showBanner=OFF", "--spring.main.registerShutdownHook=false",
				"--server.port=0", "--spring.main.sources=" + StringUtils.arrayToCommaDelimitedString(args) };
	}

}
