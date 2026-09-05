package org.ligoj.app.resource.plugin;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Plug-ins automation settings: scheduled check of new versions, automatic download of these versions, and the
 * maintenance window restarting the context when updates are staged. Cron expressions use the Spring format (6
 * fields, seconds first).
 */
@Getter
@Setter
public class PluginScheduleEditionVo {

	/**
	 * When <code>true</code>, the new versions of the installed plug-ins are checked following {@link #checkCron}.
	 */
	private boolean checkEnabled;

	/**
	 * Cron expression of the check, Spring format.
	 */
	@NotBlank
	private String checkCron;

	/**
	 * When <code>true</code>, the newer versions found by the check are downloaded (staged for the next restart).
	 * Requires {@link #checkEnabled}.
	 */
	private boolean updateEnabled;

	/**
	 * When <code>true</code>, the context is restarted following {@link #maintenanceCron} when at least one plug-in
	 * update is staged.
	 */
	private boolean maintenanceEnabled;

	/**
	 * Cron expression of the maintenance window, Spring format.
	 */
	@NotBlank
	private String maintenanceCron;
}
