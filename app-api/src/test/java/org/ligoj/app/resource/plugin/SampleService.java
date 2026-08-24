/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.ServicePlugin;
import org.springframework.stereotype.Component;

/**
 * Sample service for test.
 */
@Component
public class SampleService implements ServicePlugin {

	@Override
	public String getKey() {
		return "service:sample";
	}

}
