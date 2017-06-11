package org.ligoj.boot.web;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.embedded.ConfigurableEmbeddedServletContainer;
import org.springframework.util.StringUtils;

/**
 * Test class of {@link Application}
 */
public class ApplicationTest {

	private static String oldCp = System.getProperty("java.class.path");

	@AfterClass
	public static void resetTestEnv() {
		System.clearProperty("app-env");
		if (oldCp == null) {
			System.clearProperty("java.class.path");
		} else {
			System.setProperty("java.class.path", oldCp);
		}
	}

	@Test
	public void configClassContext() throws Exception {
		Application.main(getArgs(getClass().getName()));
	}

	@Test
	public void configure() throws Exception {
		new Application().configure(Mockito.mock(SpringApplicationBuilder.class));
		new Application().containerCustomizer().customize(Mockito.mock(ConfigurableEmbeddedServletContainer.class));
	}

	@Test
	public void getEnvironment() {
		final Application application = new Application();
		application.environmentCode = "auto";
		Assert.assertEquals("", application.getEnvironment());
		application.environmentCode = "any";
		Assert.assertEquals("any", application.getEnvironment());
		application.environmentCode = "auto";
		System.setProperty("java.class.path", "any.war");
		Assert.assertEquals("-prod", application.getEnvironment());
	}

	protected String[] getArgs(String... args) {
		final List<String> list = new ArrayList<>(
				Arrays.asList("--spring.main.webEnvironment=false", "--spring.main.showBanner=OFF", "--spring.main.registerShutdownHook=false"));
		if (args.length > 0) {
			list.add("--spring.main.sources=" + StringUtils.arrayToCommaDelimitedString(args));
		}
		return list.toArray(new String[list.size()]);
	}

}
