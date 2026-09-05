package org.ligoj.app.resource.plugin;

import java.time.Instant;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

/**
 * Plug-ins automation state: the settings plus the computed schedule and the result of the last check.
 */
@Getter
@Setter
public class PluginScheduleVo extends PluginScheduleEditionVo {

	/**
	 * Repository used by the check and the downloads.
	 */
	private String repository;

	/**
	 * Next execution of the check, <code>null</code> when disabled.
	 */
	private Instant nextCheck;

	/**
	 * Next execution of the maintenance window, <code>null</code> when disabled.
	 */
	private Instant nextMaintenance;

	/**
	 * Last execution of the check, <code>null</code> when never executed.
	 */
	private Instant lastCheck;

	/**
	 * Plug-ins having a newer version in the repository at the last check: artifact to version.
	 */
	private Map<String, String> availableUpdates;

	/**
	 * Number of plug-ins with a newer version downloaded in the plug-ins directory, applied at the next restart.
	 */
	private int stagedUpdates;
}
