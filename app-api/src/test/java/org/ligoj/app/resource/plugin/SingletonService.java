/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.ServicePlugin;

/**
 * Sample service for test.
 */
public class SingletonService implements ServicePlugin {

	@Override
	public String getKey() {
		return "service:singleton";
	}

}
