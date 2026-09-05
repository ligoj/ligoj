package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.ScheduledFuture;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.ligoj.bootstrap.resource.system.session.ISessionSettingsProvider;
import org.ligoj.bootstrap.resource.system.session.SessionSettings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.extern.slf4j.Slf4j;

/**
 * Plug-ins automation: a scheduled check of the new versions available in the repository, the optional automatic
 * download of these versions (staged in the plug-ins directory), and a maintenance window restarting the context
 * only when at least one update is staged. Everything is driven by configuration values, so they can also come from
 * the environment, and rescheduled on change. The result of the last check is exposed to the session settings for
 * the administrators' navbar indicator.
 */
@Path("/system/plugin/schedule")
@Service
@Produces(MediaType.APPLICATION_JSON)
@Slf4j
public class PluginScheduleResource implements ISessionSettingsProvider {

	/**
	 * Configuration: the scheduled check is enabled.
	 */
	public static final String CONF_CHECK = "ligoj.plugin.check";

	/**
	 * Configuration: cron expression (Spring format) of the check.
	 */
	public static final String CONF_CHECK_CRON = "ligoj.plugin.check.cron";

	/**
	 * Configuration: the newer versions found by the check are downloaded. Requires {@link #CONF_CHECK}.
	 */
	public static final String CONF_UPDATE = "ligoj.plugin.update";

	/**
	 * Configuration: the maintenance window is enabled.
	 */
	public static final String CONF_MAINTENANCE = "ligoj.plugin.maintenance";

	/**
	 * Configuration: cron expression (Spring format) of the maintenance window.
	 */
	public static final String CONF_MAINTENANCE_CRON = "ligoj.plugin.maintenance.cron";

	/**
	 * Configuration (written by the check): epoch milliseconds of the last check.
	 */
	public static final String CONF_CHECK_LAST = "ligoj.plugin.check.last";

	/**
	 * Configuration (written by the check): the plug-ins having a newer version, as <code>artifact:version</code>
	 * comma separated entries. Absent when there is no newer version.
	 */
	public static final String CONF_CHECK_UPDATES = "ligoj.plugin.check.updates";

	/**
	 * Default cron of the check: every day at 3 AM.
	 */
	public static final String DEFAULT_CHECK_CRON = "0 0 3 * * *";

	/**
	 * Default cron of the maintenance window: every Sunday at 4 AM. Numeric day of week: the cron editor of the UI
	 * does not parse the day names.
	 */
	public static final String DEFAULT_MAINTENANCE_CRON = "0 0 4 * * 0";

	/**
	 * Session data key exposing the available updates ({@link #CONF_CHECK_UPDATES} value) to the UI.
	 */
	public static final String SESSION_UPDATES = "plugin-updates";

	private static final String CONF_REPOSITORY = "ligoj.plugin.repository";
	private static final String CONF_INSTALL_JAVADOC = "ligoj.plugin.install.javadoc";
	private static final String DEFAULT_REPOSITORY = "central";

	@Autowired
	private SystemPluginResource pluginResource;

	@Autowired
	private ConfigurationResource configuration;

	private ThreadPoolTaskScheduler scheduler;
	private ScheduledFuture<?> checkTask;
	private ScheduledFuture<?> maintenanceTask;

	/**
	 * Start the scheduler and apply the current schedule.
	 */
	@PostConstruct
	public void init() {
		scheduler = new ThreadPoolTaskScheduler();
		scheduler.setPoolSize(1);
		scheduler.setThreadNamePrefix("plugin-schedule-");
		scheduler.setDaemon(true);
		scheduler.initialize();
		reschedule();
	}

	/**
	 * Stop the scheduler.
	 */
	@PreDestroy
	public void destroy() {
		cancelTasks();
		if (scheduler != null) {
			scheduler.shutdown();
		}
	}

	/**
	 * Return the automation settings and state.
	 *
	 * @return The automation settings, the computed next executions and the last check result.
	 */
	@GET
	public PluginScheduleVo get() {
		final var vo = new PluginScheduleVo();
		vo.setCheckEnabled(isEnabled(CONF_CHECK));
		vo.setCheckCron(configuration.get(CONF_CHECK_CRON, DEFAULT_CHECK_CRON));
		vo.setUpdateEnabled(vo.isCheckEnabled() && isEnabled(CONF_UPDATE));
		vo.setMaintenanceEnabled(isEnabled(CONF_MAINTENANCE));
		vo.setMaintenanceCron(configuration.get(CONF_MAINTENANCE_CRON, DEFAULT_MAINTENANCE_CRON));
		vo.setRepository(getRepository());
		vo.setNextCheck(vo.isCheckEnabled() ? next(vo.getCheckCron()) : null);
		vo.setNextMaintenance(vo.isMaintenanceEnabled() ? next(vo.getMaintenanceCron()) : null);
		vo.setLastCheck(Optional.ofNullable(configuration.get(CONF_CHECK_LAST)).filter(StringUtils::isNumeric)
				.map(Long::valueOf).map(Instant::ofEpochMilli).orElse(null));
		vo.setAvailableUpdates(parseUpdates(configuration.get(CONF_CHECK_UPDATES)));
		vo.setStagedUpdates(stagedUpdates());
		return vo;
	}

	/**
	 * Update the automation settings and reschedule the jobs. The automatic update is stored as enabled only when
	 * the check is enabled too.
	 *
	 * @param vo The new settings.
	 */
	@PUT
	public void update(final PluginScheduleEditionVo vo) {
		validateCron("checkCron", vo.getCheckCron());
		validateCron("maintenanceCron", vo.getMaintenanceCron());
		configuration.put(CONF_CHECK, String.valueOf(vo.isCheckEnabled()), true);
		configuration.put(CONF_CHECK_CRON, vo.getCheckCron().trim(), true);
		configuration.put(CONF_UPDATE, String.valueOf(vo.isCheckEnabled() && vo.isUpdateEnabled()), true);
		configuration.put(CONF_MAINTENANCE, String.valueOf(vo.isMaintenanceEnabled()), true);
		configuration.put(CONF_MAINTENANCE_CRON, vo.getMaintenanceCron().trim(), true);
		log.info("Plug-ins automation updated: check={} ('{}'), update={}, maintenance={} ('{}')", vo.isCheckEnabled(),
				vo.getCheckCron(), vo.isCheckEnabled() && vo.isUpdateEnabled(), vo.isMaintenanceEnabled(),
				vo.getMaintenanceCron());
		reschedule();
	}

	/**
	 * Run the check now, then return the state.
	 *
	 * @return The automation state after the check.
	 * @throws IOException When the repository cannot be read.
	 */
	@POST
	@Path("check")
	public PluginScheduleVo checkNow() throws IOException {
		check();
		return get();
	}

	/**
	 * Check the new versions: refresh the last versions from the repository, record the plug-ins having a newer
	 * version than the installed one (and than the already staged one), and download them when the automatic update
	 * is enabled.
	 *
	 * @return The plug-ins having a newer version: artifact to version.
	 * @throws IOException When the repository cannot be read.
	 */
	protected Map<String, String> check() throws IOException {
		final var repository = getRepository();
		pluginResource.invalidateLastPluginVersions(repository);
		final var updates = new TreeMap<String, String>();
		pluginResource.findAll(repository).stream()
				.filter(p -> p.getNewVersion() != null && !p.getNewVersion().equals(p.getLatestLocalVersion()))
				.forEach(p -> updates.put(p.getPlugin().getArtifact(), p.getNewVersion()));
		configuration.put(CONF_CHECK_LAST, String.valueOf(System.currentTimeMillis()), true);
		if (updates.isEmpty()) {
			configuration.delete(CONF_CHECK_UPDATES);
		} else {
			configuration.put(CONF_CHECK_UPDATES, formatUpdates(updates), true);
		}
		log.info("Plug-ins check from repository '{}': {} newer version(s) {}", repository, updates.size(), updates);

		if (!updates.isEmpty() && isEnabled(CONF_CHECK) && isEnabled(CONF_UPDATE)) {
			// Automatic update: download now, applied at the next restart (maintenance window)
			final var javadoc = Boolean.parseBoolean(configuration.get(CONF_INSTALL_JAVADOC, "true"));
			updates.forEach((artifact, version) -> {
				try {
					pluginResource.install(artifact, version, repository, javadoc);
					log.info("Plug-in {} v{} downloaded, applied at the next restart", artifact, version);
				} catch (final RuntimeException e) {
					log.error("Unable to download the plug-in {} v{}", artifact, version, e);
				}
			});
		}
		return updates;
	}

	/**
	 * Maintenance window: restart the context when at least one plug-in update is staged.
	 */
	protected void maintenance() {
		try {
			final var staged = stagedUpdates();
			if (staged > 0) {
				log.info("Maintenance window: {} staged plug-in update(s), restarting the context", staged);
				pluginResource.restart();
			} else {
				log.info("Maintenance window: no staged plug-in update, nothing to apply");
			}
		} catch (final RuntimeException e) {
			log.error("Maintenance window failed", e);
		}
	}

	/**
	 * Number of plug-ins with a newer version in the plug-ins directory than the loaded one (including the staged
	 * new plug-ins), applied at the next restart.
	 */
	protected int stagedUpdates() {
		try {
			return (int) pluginResource.findAll(getRepository()).stream().filter(p -> p.getLatestLocalVersion() != null)
					.count();
		} catch (final IOException e) {
			log.warn("Unable to count the staged plug-in updates", e);
			return 0;
		}
	}

	/**
	 * Apply the current settings to the scheduler.
	 */
	protected void reschedule() {
		cancelTasks();
		if (isEnabled(CONF_CHECK)) {
			checkTask = schedule(configuration.get(CONF_CHECK_CRON, DEFAULT_CHECK_CRON), "check", this::safeCheck);
		}
		if (isEnabled(CONF_MAINTENANCE)) {
			maintenanceTask = schedule(configuration.get(CONF_MAINTENANCE_CRON, DEFAULT_MAINTENANCE_CRON),
					"maintenance", this::maintenance);
		}
	}

	private ScheduledFuture<?> schedule(final String cron, final String name, final Runnable task) {
		if (scheduler == null || !CronExpression.isValidExpression(cron)) {
			log.warn("Plug-ins {} schedule ignored: invalid cron expression '{}'", name, cron);
			return null;
		}
		log.info("Plug-ins {} scheduled with cron '{}', next execution at {}", name, cron, next(cron));
		return scheduler.schedule(task, new CronTrigger(cron));
	}

	private void cancelTasks() {
		if (checkTask != null) {
			checkTask.cancel(false);
			checkTask = null;
		}
		if (maintenanceTask != null) {
			maintenanceTask.cancel(false);
			maintenanceTask = null;
		}
	}

	private void safeCheck() {
		try {
			check();
		} catch (final Exception e) {
			log.error("Scheduled plug-ins check failed", e);
		}
	}

	/**
	 * Next execution of a cron expression, <code>null</code> when invalid or never.
	 */
	static Instant next(final String cron) {
		if (cron == null || !CronExpression.isValidExpression(cron)) {
			return null;
		}
		final var next = CronExpression.parse(cron).next(ZonedDateTime.now());
		return next == null ? null : next.toInstant();
	}

	private void validateCron(final String property, final String cron) {
		if (cron == null || !CronExpression.isValidExpression(cron.trim())) {
			throw new ValidationJsonException(property, "cron");
		}
	}

	private boolean isEnabled(final String key) {
		return Boolean.parseBoolean(configuration.get(key, "false"));
	}

	private String getRepository() {
		return configuration.get(CONF_REPOSITORY, DEFAULT_REPOSITORY);
	}

	/**
	 * Parse the <code>artifact:version,...</code> stored value.
	 */
	static Map<String, String> parseUpdates(final String raw) {
		return Arrays.stream(StringUtils.defaultString(raw).split(",")).map(String::trim).filter(e -> e.contains(":"))
				.collect(Collectors.toMap(e -> e.substring(0, e.indexOf(':')), e -> e.substring(e.indexOf(':') + 1),
						(a, b) -> b, TreeMap::new));
	}

	/**
	 * Format the updates as the <code>artifact:version,...</code> stored value.
	 */
	static String formatUpdates(final Map<String, String> updates) {
		return updates.entrySet().stream().map(e -> e.getKey() + ":" + e.getValue()).collect(Collectors.joining(","));
	}

	@Override
	public void decorate(final SessionSettings settings) {
		// Available updates for the administrators' navbar indicator; empty when none
		settings.getApplicationSettings().getData().computeIfAbsent(SESSION_UPDATES,
				_ -> StringUtils.defaultString(configuration.get(CONF_CHECK_UPDATES)));
	}
}
