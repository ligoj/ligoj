/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.bootstrap.core.plugin.FeaturePlugin;

/**
 * Sample tool for test.
 */
public class SampleTool4 implements FeaturePlugin, RestContract {

	@Override
	public String getKey() {
		return "service:sample:tool3";
	}

}
