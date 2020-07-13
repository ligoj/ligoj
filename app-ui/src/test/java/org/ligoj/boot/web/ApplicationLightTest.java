/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.web;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test class of {@link Application}
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest
class ApplicationLightTest {

	@Test
	void main() throws Exception {
		Application.main(getArgs());
	}

	private String[] getArgs() {
		List<String> list = new ArrayList<>(Arrays.asList("--spring.main.banner-mode=OFF", "--spring.main.registerShutdownHook=false",
				"--spring.main.web-application-type=NONE", "--spring.profiles.active=test"));
		return list.toArray(new String[list.size()]);
	}

}
