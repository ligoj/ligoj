package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.ServicePlugin;

public class SampleService implements ServicePlugin {

	@Override
	public String getKey() {
		return "service:sample";
	}

}
