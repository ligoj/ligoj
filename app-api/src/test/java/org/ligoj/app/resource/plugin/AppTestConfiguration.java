/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cloud.context.restart.RestartEndpoint;
import org.springframework.context.annotation.Bean;

import static org.mockito.Mockito.mock;

/**
 * Test configuration for some boot components.
 */
@TestConfiguration
class AppTestConfiguration {

	@Bean
	RestartEndpoint mockRestartEndpoint() {
		return mock(RestartEndpoint.class);
	}
}
