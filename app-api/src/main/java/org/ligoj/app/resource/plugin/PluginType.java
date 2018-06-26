/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

/**
 * Plugin type
 */
public enum PluginType {
	/**
	 * A feature, not hierarchical. No formal attached data. Not linkable to a project.
	 */
	FEATURE,

	/**
	 * A service description, contract.
	 */
	SERVICE,

	/**
	 * A tool implementing a service.
	 */
	TOOL
}
