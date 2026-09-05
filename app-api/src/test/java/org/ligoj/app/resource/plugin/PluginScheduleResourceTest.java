package org.ligoj.app.resource.plugin;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.reflect.FieldUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.ligoj.bootstrap.model.system.SystemPlugin;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.ligoj.bootstrap.resource.system.session.ApplicationSettings;
import org.ligoj.bootstrap.resource.system.session.SessionSettings;
import org.ligoj.bootstrap.core.plugin.PluginVo;

/**
 * Test class of {@link PluginScheduleResource}, with an in-memory configuration.
 */
class PluginScheduleResourceTest {

	private PluginScheduleResource resource;
	private SystemPluginResource plugins;
	private ConfigurationResource configuration;
	private Map<String, String> store;

	@BeforeEach
	void prepare() throws IllegalAccessException {
		store = new HashMap<>();
		configuration = mock(ConfigurationResource.class);
		when(configuration.get(anyString())).thenAnswer(i -> store.get(i.getArgument(0, String.class)));
		when(configuration.get(anyString(), anyString()))
				.thenAnswer(i -> store.getOrDefault(i.getArgument(0, String.class), i.getArgument(1, String.class)));
		doAnswer(i -> store.put(i.getArgument(0, String.class), i.getArgument(1, String.class))).when(configuration)
				.put(anyString(), anyString(), anyBoolean());
		doAnswer(i -> store.remove(i.getArgument(0, String.class))).when(configuration).delete(anyString());
		plugins = mock(SystemPluginResource.class);
		resource = new PluginScheduleResource();
		FieldUtils.writeField(resource, "pluginResource", plugins, true);
		FieldUtils.writeField(resource, "configuration", configuration, true);
		resource.init();
	}

	@AfterEach
	void destroy() {
		resource.destroy();
	}

	private PluginVo vo(final String artifact, final String newVersion, final String latestLocalVersion) {
		final var plugin = new SystemPlugin();
		plugin.setArtifact(artifact);
		plugin.setVersion("1.0.0");
		final var vo = new LigojPluginVo();
		vo.setId(artifact);
		vo.setPlugin(plugin);
		vo.setNewVersion(newVersion);
		vo.setLatestLocalVersion(latestLocalVersion);
		return vo;
	}

	private PluginScheduleEditionVo edition(final boolean check, final boolean update, final boolean maintenance) {
		final var vo = new PluginScheduleEditionVo();
		vo.setCheckEnabled(check);
		vo.setCheckCron("0 30 2 * * *");
		vo.setUpdateEnabled(update);
		vo.setMaintenanceEnabled(maintenance);
		vo.setMaintenanceCron("0 0 5 * * SAT");
		return vo;
	}

	@Test
	void getDefaults() throws IOException {
		when(plugins.findAll("central")).thenReturn(List.of(vo("plugin-a", null, null)));
		final var vo = resource.get();
		Assertions.assertFalse(vo.isCheckEnabled());
		Assertions.assertEquals(PluginScheduleResource.DEFAULT_CHECK_CRON, vo.getCheckCron());
		Assertions.assertFalse(vo.isUpdateEnabled());
		Assertions.assertFalse(vo.isMaintenanceEnabled());
		Assertions.assertEquals(PluginScheduleResource.DEFAULT_MAINTENANCE_CRON, vo.getMaintenanceCron());
		Assertions.assertEquals("central", vo.getRepository());
		Assertions.assertNull(vo.getNextCheck());
		Assertions.assertNull(vo.getNextMaintenance());
		Assertions.assertNull(vo.getLastCheck());
		Assertions.assertTrue(vo.getAvailableUpdates().isEmpty());
		Assertions.assertEquals(0, vo.getStagedUpdates());
	}

	@Test
	void updateInvalidCron() {
		final var vo = edition(true, false, false);
		vo.setCheckCron("every day");
		Assertions.assertEquals("checkCron",
				Assertions.assertThrows(ValidationJsonException.class, () -> resource.update(vo)).getErrors().keySet()
						.iterator().next());
		Assertions.assertTrue(store.isEmpty());
	}

	@Test
	void updateSchedules() throws IOException {
		when(plugins.findAll("central")).thenReturn(List.of());
		resource.update(edition(true, true, true));
		Assertions.assertEquals("true", store.get(PluginScheduleResource.CONF_CHECK));
		Assertions.assertEquals("0 30 2 * * *", store.get(PluginScheduleResource.CONF_CHECK_CRON));
		Assertions.assertEquals("true", store.get(PluginScheduleResource.CONF_UPDATE));
		Assertions.assertEquals("true", store.get(PluginScheduleResource.CONF_MAINTENANCE));
		Assertions.assertEquals("0 0 5 * * SAT", store.get(PluginScheduleResource.CONF_MAINTENANCE_CRON));
		var state = resource.get();
		Assertions.assertNotNull(state.getNextCheck());
		Assertions.assertNotNull(state.getNextMaintenance());
		Assertions.assertTrue(state.isUpdateEnabled());

		// The automatic update requires the check: stored as disabled otherwise
		resource.update(edition(false, true, false));
		Assertions.assertEquals("false", store.get(PluginScheduleResource.CONF_UPDATE));
		state = resource.get();
		Assertions.assertNull(state.getNextCheck());
		Assertions.assertNull(state.getNextMaintenance());
		Assertions.assertFalse(state.isUpdateEnabled());
	}

	@Test
	void checkRecordsUpdatesAndDownloadsWhenEnabled() throws IOException {
		store.put(PluginScheduleResource.CONF_CHECK, "true");
		store.put(PluginScheduleResource.CONF_UPDATE, "true");
		// plugin-a: newer version; plugin-b: newer version already staged; plugin-c: up to date
		when(plugins.findAll("central"))
				.thenReturn(List.of(vo("plugin-a", "2.0.0", null), vo("plugin-b", "1.5.0", "1.5.0"), vo("plugin-c", null, null)));
		Assertions.assertEquals(Map.of("plugin-a", "2.0.0"), resource.check());
		verify(plugins).invalidateLastPluginVersions("central");
		verify(plugins).install("plugin-a", "2.0.0", "central", true);
		verify(plugins, never()).install("plugin-b", "1.5.0", "central", true);
		Assertions.assertEquals("plugin-a:2.0.0", store.get(PluginScheduleResource.CONF_CHECK_UPDATES));
		Assertions.assertTrue(Long.parseLong(store.get(PluginScheduleResource.CONF_CHECK_LAST)) > 0);
		Assertions.assertEquals(Map.of("plugin-a", "2.0.0"), resource.get().getAvailableUpdates());
		Assertions.assertNotNull(resource.get().getLastCheck());
	}

	@Test
	void checkWithoutAutomaticUpdate() throws IOException {
		store.put(PluginScheduleResource.CONF_CHECK, "true");
		store.put(PluginScheduleResource.CONF_CHECK_UPDATES, "plugin-old:0.1");
		when(plugins.findAll("central")).thenReturn(List.of(vo("plugin-a", "2.0.0", null)));
		Assertions.assertEquals(Map.of("plugin-a", "2.0.0"), resource.check());
		verify(plugins, never()).install(anyString(), anyString(), anyString(), anyBoolean());

		// No newer version: the previous result is cleared
		when(plugins.findAll("central")).thenReturn(List.of(vo("plugin-a", null, null)));
		Assertions.assertTrue(resource.check().isEmpty());
		Assertions.assertNull(store.get(PluginScheduleResource.CONF_CHECK_UPDATES));
	}

	@Test
	void maintenanceRestartsOnlyWithStagedUpdates() throws IOException {
		when(plugins.findAll("central")).thenReturn(List.of(vo("plugin-a", null, null)));
		resource.maintenance();
		verify(plugins, never()).restart();

		when(plugins.findAll("central")).thenReturn(List.of(vo("plugin-a", "2.0.0", "2.0.0")));
		Assertions.assertEquals(1, resource.get().getStagedUpdates());
		resource.maintenance();
		verify(plugins).restart();
	}

	@Test
	void decorate() throws IllegalAccessException {
		store.put(PluginScheduleResource.CONF_CHECK_UPDATES, "plugin-a:2.0.0,plugin-b:3.0.0");
		final var settings = new SessionSettings();
		FieldUtils.writeDeclaredField(settings, "applicationSettings", new ApplicationSettings(), true);
		resource.decorate(settings);
		Assertions.assertEquals("plugin-a:2.0.0,plugin-b:3.0.0",
				settings.getApplicationSettings().getData().get(PluginScheduleResource.SESSION_UPDATES));
	}

	@Test
	void updatesFormat() {
		Assertions.assertEquals(Map.of("plugin-a", "2.0.0", "plugin-b", "3.0.0-SNAPSHOT"),
				PluginScheduleResource.parseUpdates(" plugin-a:2.0.0 , plugin-b:3.0.0-SNAPSHOT,,broken"));
		Assertions.assertTrue(PluginScheduleResource.parseUpdates(null).isEmpty());
		Assertions.assertEquals("plugin-a:2.0.0,plugin-b:3.0.0", PluginScheduleResource
				.formatUpdates(PluginScheduleResource.parseUpdates("plugin-b:3.0.0,plugin-a:2.0.0")));
		Assertions.assertNull(PluginScheduleResource.next("not a cron"));
		Assertions.assertNotNull(PluginScheduleResource.next("0 0 3 * * *"));
	}
}
