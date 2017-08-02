package org.ligoj.app.resource.plugin;

import java.util.Map;

import org.ligoj.app.api.SubscriptionStatusWithData;
import org.ligoj.app.api.ToolPlugin;

public class SampleTool1 implements ToolPlugin {

	@Override
	public String getKey() {
		return "service:sample:tool1";
	}

	@Override
	public boolean checkStatus(String node, Map<String, String> parameters) throws Exception {
		return false;
	}

	@Override
	public SubscriptionStatusWithData checkSubscriptionStatus(String node, Map<String, String> parameters) throws Exception {
		return null;
	}

}
