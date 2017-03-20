package org.ligoj.app.resource.plugin;

import org.ligoj.bootstrap.core.NamedBean;
import lombok.Getter;
import lombok.Setter;

/**
 * Plug-in information.
 */
@Getter
@Setter
public class PluginVo extends NamedBean<String> {

	/**
	 * The plug-in version. Should follow the <a href="http://semver.org/">semantic versioning</a>
	 */
	private String version;
	/**
	 * The plug-in vendor. May be <code>null</code>.
	 */
	private String vendor;
	/**
	 * Amount of nodes using this plug-in.
	 */
	private int nodes;

	/**
	 * Amount of subscriptions using this plug-in.
	 */
	private int subscriptions;

	/**
	 * When <code>true</code>, this plug-in provides a tool. An implementation of a service.
	 */
	private boolean tool;
}
