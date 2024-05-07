/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.SubscriptionStatusWithData;
import org.ligoj.app.api.ToolPlugin;

import java.util.Map;

/**
 * Mock tool.
 */
public class SampleTool1 implements ToolPlugin {

	@Override
	public String getKey() {
		return "service:sample:tool1";
	}

	@Override
	public boolean checkStatus(String node, Map<String, String> parameters) {
		return false;
	}

	@Override
	public SubscriptionStatusWithData checkSubscriptionStatus(String node, Map<String, String> parameters) {
		return null;
	}

}
