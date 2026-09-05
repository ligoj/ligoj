package org.ligoj.app.resource.schedule;

import java.util.List;

/**
 * A bean scheduling its own tasks outside the Spring {@code @Scheduled} mechanism, exposing them to the
 * administration (see {@link ScheduledTaskResource}).
 */
public interface ScheduledTaskProvider {

	/**
	 * Return the scheduled tasks of this provider, enabled or not.
	 *
	 * @return The scheduled tasks. Never <code>null</code>.
	 */
	List<ScheduledTaskVo> getScheduledTasks();
}
