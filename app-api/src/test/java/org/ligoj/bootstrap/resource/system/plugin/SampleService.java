/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.plugin;

import org.ligoj.bootstrap.core.plugin.FeaturePlugin;

/**
 * Sample service for test.
 */
public class SampleService implements FeaturePlugin {

	@Override
	public String getKey() {
		return "service:sample";
	}

}
