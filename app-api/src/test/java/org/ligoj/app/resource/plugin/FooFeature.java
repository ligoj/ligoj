/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.bootstrap.core.plugin.FeaturePlugin;
import org.springframework.stereotype.Component;

/**
 * Sample feature
 */
@Component
public class FooFeature implements FeaturePlugin {

	@Override
	public String getKey() {
		return "feature:foo";
	}

	@Override
	public String getName() {
		return "Foo";
	}

}
