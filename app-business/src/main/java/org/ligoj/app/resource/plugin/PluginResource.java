package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

import javax.transaction.Transactional;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.api.FeaturePlugin;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.api.SubscriptionMode;
import org.ligoj.app.api.ToolPlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.PluginRepository;
import org.ligoj.app.dao.SubscriptionRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Plugin;
import org.ligoj.app.model.PluginType;
import org.ligoj.app.resource.node.NodeResource;
import org.ligoj.bootstrap.core.NamedBean;
import org.ligoj.bootstrap.core.SpringUtils;
import org.ligoj.bootstrap.core.dao.csv.CsvForJpa;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Persistable;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Manage plug-in life-cycle.
 */
@Path("/plugin")
@Slf4j
@Component
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class PluginResource {

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private PluginRepository repository;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

	@Autowired
	private CsvForJpa csvForJpa;

	/**
	 * Return all plug-ins with details.
	 *
	 * @return All plug-ins with details.
	 */
	@GET
	public List<PluginVo> findAll() {
		// Get the existing plug-in features
		return repository.findAll().stream().map(p -> {
			final String key = p.getKey();
			final PluginVo vo = new PluginVo();
			vo.setId(key);

			// Find the associated feature class
			final FeaturePlugin feature = SpringUtils.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream()
					.filter(f -> key.equals(f.getKey())).findFirst().get();
			vo.setName(StringUtils.removeStart(feature.getName(), "Ligoj - Plugin "));
			vo.setLocation(feature.getClass().getProtectionDomain().getCodeSource().getLocation().getPath());
			vo.setVendor(feature.getVendor());
			vo.setPlugin(p);
			if (p.getType() != PluginType.FEATURE) {
				// This is a node (service or tool) add statistics and details
				vo.setNodes(nodeRepository.countByRefined(key));
				vo.setSubscriptions(subscriptionRepository.countByNode(key));
				vo.setNode(NodeResource.toVo(nodeRepository.findOne(key)));
			}
			return vo;
		}).sorted(Comparator.comparing(NamedBean::getId)).collect(Collectors.toList());
	}

	/**
	 * Handle the newly installed plug-ins implementing {@link FeaturePlugin}, and that's includes
	 * {@link ServicePlugin}. Note the plug-ins are installed in a natural order based on their key's name to ensure the
	 * parents plug-ins are configured first. <br>
	 * Note the transactional behavior of this process : if one plug-in failed to be configured, then the entire process
	 * is cancelled. The previously and the not processed discovered plug-ins are not configured.
	 * 
	 * @param event
	 *            The Spring event.
	 */
	@EventListener
	public void refreshPlugins(final ContextRefreshedEvent event) {
		// Get the existing plug-in features
		final Map<String, Plugin> plugins = repository.findAll().stream().collect(Collectors.toMap(Plugin::getKey, Function.identity()));

		// Changes, order by the related feature's key
		final Map<String, FeaturePlugin> newFeatures = new TreeMap<>();
		final Map<String, FeaturePlugin> updateFeatures = new TreeMap<>();
		final Set<Plugin> removedPlugins = new HashSet<>(plugins.values());

		// Compare with the available plug-in implementing ServicePlugin
		event.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream().forEach(s -> {
			final String newVersion = getVersion(s);
			final Plugin plugin = plugins.get(s.getKey());
			if (plugin == null) {
				newFeatures.put(s.getKey(), s);
			} else if (!plugin.getVersion().equals(newVersion)) {
				updateFeatures.put(s.getKey(), s);
				plugin.setVersion(newVersion);
			}
			removedPlugins.remove(plugin);
		});

		// First install the data of new plug-ins
		updateFeatures.values().stream().forEach(s -> configurePluginUpdate(s, plugins.get(s.getKey())));
		newFeatures.values().stream().forEach(this::configurePluginInstall);

		// Then install/update the plug-in
		updateFeatures.forEach((k, s) -> s.update(plugins.get(k).getVersion()));
		newFeatures.values().forEach(FeaturePlugin::install);
		log.info("Plugins are now configured");

		// And remove the old plug-in no more installed
		repository.deleteAll(removedPlugins.stream().map(Persistable::getId).collect(Collectors.toList()));
	}

	/**
	 * Returns a plug-in's last modified time.
	 * 
	 * @param plugin
	 *            The plug-in class. Will be used to find the related container archive or class file.
	 * @return a {@code String} representing the time the file was last modified, or a default time stamp to indicate
	 *         the time of last modification is not supported by the file system
	 * @throws URISyntaxException
	 *             if an I/O error occurs
	 * @throws IOException
	 *             if an I/O error occurs
	 * @throws SecurityException
	 *             In the case of the default provider, and a security manager is
	 *             installed, its {@link SecurityManager#checkRead(String) checkRead}
	 *             method denies read access to the file.
	 */
	protected String getLastModifiedTime(final FeaturePlugin plugin) throws IOException, URISyntaxException {
		return Files.getLastModifiedTime(Paths.get(plugin.getClass().getProtectionDomain().getCodeSource().getLocation().toURI())).toString();
	}

	/**
	 * Configure the updated plug-in in this order :
	 * <ul>
	 * <li>The required entities for the plug-in are persisted. These entities are discovered from
	 * {@link FeaturePlugin#getInstalledEntities()} and related CSV files are load in the data base.</li>
	 * <li>The entity {@link Plugin} is updated to reflect the new version.</li>
	 * </ul>
	 * 
	 * @param plugin
	 *            The newly discovered plug-in.
	 */
	protected void configurePluginUpdate(final FeaturePlugin plugin, final Plugin entity) {
		final String newVersion = getVersion(plugin);
		log.info("Updating the plugin {} v{} -> v{}", plugin.getKey(), entity.getVersion(), newVersion);
		try {
			configurePluginEntities(plugin.getInstalledEntities());
			entity.setVersion(newVersion);
		} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
			// Something happened
			log.error("Updating the plugin {} v{} -> v{} succeed", plugin.getKey(), entity.getVersion(), newVersion);
			throw new TechnicalException("Configuring the new plugin failed", e, plugin.getKey());
		}
	}

	/**
	 * Configure the new plug-in in this order :
	 * <ul>
	 * <li>The required entities for the plug-in are persisted. These entities are discovered from
	 * {@link FeaturePlugin#getInstalledEntities()} and related CSV files are load in the data base. Note that there is
	 * at least one {@link Node} records added and related to the plug-in key.</li>
	 * <li>A new {@link Plugin} is inserted to maintain the validated plug-in and version</li>
	 * </ul>
	 * 
	 * @param plugin
	 *            The newly discovered plug-in.
	 */
	protected void configurePluginInstall(final FeaturePlugin plugin) {
		final String newVersion = getVersion(plugin);
		log.info("Installing the new plugin {} v{}", plugin.getKey(), newVersion);
		try {
			final List<Class<?>> installedEntities = plugin.getInstalledEntities();
			final Plugin entity = new Plugin();

			// Special process for service plug-ins
			if (plugin instanceof ServicePlugin) {
				// Either a service either a tool, depends on the level of refinement
				entity.setType(determinePluginType((ServicePlugin) plugin));

				if (!installedEntities.contains(Node.class)) {
					// Persist the partial default node now for the bellow installation process
					nodeRepository.saveAndFlush(newNode((ServicePlugin) plugin));
				}
			} else {
				// A simple feature
				entity.setType(PluginType.FEATURE);
			}
			configurePluginEntities(installedEntities);

			entity.setKey(plugin.getKey());
			entity.setVersion(newVersion);
			repository.saveAndFlush(entity);
		} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
			// Something happened
			log.error("Installing the new plugin {} v{} failed", plugin.getKey(), newVersion, e);
			throw new TechnicalException("Configuring the new plugin failed", e, plugin.getKey());
		}
	}

	/**
	 * Determine the plug-in type and check it regarding the contact and the convention.
	 * 
	 * @param plugin
	 *            The plug-in resource.
	 * @return The checked {@link PluginType}
	 */
	protected PluginType determinePluginType(final ServicePlugin plugin) {
		// Determine the type from the key by convention
		final PluginType result = PluginType.values()[StringUtils.countMatches(plugin.getKey(), ':')];

		// Double check the convention with related interface
		final PluginType interfaceType;
		if (plugin instanceof ToolPlugin) {
			interfaceType = PluginType.TOOL;
		} else {
			interfaceType = PluginType.SERVICE;
		}
		if (interfaceType != result) {
			throw new TechnicalException(String.format("Incompatible type from the key (%s -> %s) vs type from the interface (%s)", plugin.getKey(),
					result, interfaceType));
		}
		return result;
	}

	private void configurePluginEntities(final List<Class<?>> installedEntities) throws IOException {

		// Insert the configuration entities of the plug-in
		for (Class<?> entityClass : installedEntities) {
			csvForJpa.insert("csv", entityClass, StandardCharsets.UTF_8.name());
		}
	}

	/**
	 * Build a new {@link Node} from the given plug-in instance using the naming convention to link the parent.
	 */
	protected Node newNode(final ServicePlugin service) {
		final Node node = new Node();
		node.setId(service.getKey());
		node.setName(service.getName());

		// Add default values
		node.setTag("functional");
		node.setTagUiClasses("fa fa-suitcase");
		node.setMode(SubscriptionMode.LINK);
		node.setUiClasses("$" + service.getName());

		// Link to the parent
		node.setRefined(getParentNode(service.getKey()));

		return node;
	}

	/**
	 * Return the parent node from a key. The node entity is retrieved from the data base without cache.
	 * 
	 * @param key
	 *            The plug-in key.
	 * @return the parent node entity or <code>null</code> when this the top most definition. Note if there is an
	 *         expected parent by convention, and the parent is not found, an error will be raised.
	 */
	protected Node getParentNode(final String key) {
		final String parentKey = key.substring(0, key.lastIndexOf(':'));
		if (parentKey.indexOf(':') == -1) {
			// Was already the top most parent
			return null;
		}

		// The closest parent has been found by convention, must be available in database
		return nodeRepository.findOneExpected(parentKey);
	}

	/**
	 * Return a fail-safe computed version of the given {@link FeaturePlugin}
	 * 
	 * @param plugin
	 *            The plug-in instance
	 * @return
	 */
	protected String getVersion(final FeaturePlugin plugin) {
		if (plugin.getVersion() == null) {
			// Not explicit version
			try {
				return getLastModifiedTime(plugin);
			} catch (final IOException | URISyntaxException e) {
				log.warn("Unable to determine the version of plug-in {}", plugin.getClass(), e);

				// Default version
				return "?";
			}
		}

		// Return the right version
		return plugin.getVersion();
	}
}
