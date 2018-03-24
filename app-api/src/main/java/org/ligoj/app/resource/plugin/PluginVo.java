/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.NodeVo;
import org.ligoj.app.model.Plugin;
import org.ligoj.bootstrap.core.NamedBean;

import lombok.Getter;
import lombok.Setter;

/**
 * Plug-in information. The "id" property correspond to the related plug-in's key.
 */
@Getter
@Setter
public class PluginVo extends NamedBean<String> {

	/**
	 * Related plug-in entity.
	 */
	private Plugin plugin;

	/**
	 * The plug-in vendor. May be <code>null</code>.
	 */
	private String vendor;

	/**
	 * Amount of nodes using this plug-in. Only relevant of plug-in type of service or tool.
	 */
	private int nodes;

	/**
	 * Associated node configuration. Only relevant of plug-in type of service or tool.
	 */
	private NodeVo node;

	/**
	 * Amount of subscriptions using this plug-in. Only relevant of plug-in type of service or tool.
	 */
	private int subscriptions;

	/**
	 * Location of this plug-in.
	 */
	private String location;
	
	/**
	 * When not <code>null</code>, a new version of this plug-in is available
	 */
	private String newVersion;
}
