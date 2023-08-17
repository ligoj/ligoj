/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;

/**
 * Test class of {@link Application}
 */
class ApplicationLightTest {

	@Test
	void testMain() {
		Application.main(getArgs());
	}

	private String[] getArgs() {
		final var list = new ArrayList<>(Arrays.asList("--spring.main.banner-mode=OFF", "--spring.main.registerShutdownHook=false",
				"--spring.main.web-application-type=NONE", "--spring.profiles.active=test"));
		return list.toArray(new String[0]);
	}

}
