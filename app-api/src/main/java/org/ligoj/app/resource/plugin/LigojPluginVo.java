/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.app.api.NodeVo;
import org.ligoj.bootstrap.core.plugin.PluginVo;

import lombok.Getter;
import lombok.Setter;

/**
 * Plug-in information related to Ligoj. The "id" property correspond to the related plug-in's key.
 */
@Getter
@Setter
public class LigojPluginVo extends PluginVo {
	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

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
}
