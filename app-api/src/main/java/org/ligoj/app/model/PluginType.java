package org.ligoj.app.model;

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
