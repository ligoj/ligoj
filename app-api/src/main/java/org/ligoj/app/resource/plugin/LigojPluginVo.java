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

	/**
	 * When <code>true</code>, the plug-in is disabled: its jar file is renamed with the
	 * {@link SystemPluginResource#DISABLED_SUFFIX} suffix, so the plug-ins class-loader does not load it at the next
	 * restart while the file stays in place for a later enabling. Like an installation or a removal, a change of this
	 * state requires a restart: compare with {@link #loaded}.
	 */
	private boolean disabled;

	/**
	 * When <code>true</code>, the plug-in is currently loaded in the class-path. A disabled but loaded plug-in, or an
	 * enabled but not loaded one, is waiting for a restart.
	 */
	private boolean loaded;
}
