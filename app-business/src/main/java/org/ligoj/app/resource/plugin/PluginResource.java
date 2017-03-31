package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.PluginRepository;
import org.ligoj.app.dao.SubscriptionRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Plugin;
import org.ligoj.app.resource.node.NodeResource;
import org.ligoj.bootstrap.core.NamedBean;
import org.ligoj.bootstrap.core.SpringUtils;
import org.ligoj.bootstrap.core.dao.csv.CsvForJpa;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
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
		return SpringUtils.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream().map(s -> {
			final PluginVo vo = new PluginVo();
			vo.setId(s.getKey());
			vo.setName(s.getName());
			vo.setVersion(getVersion(s));
			vo.setLocation(s.getClass().getProtectionDomain().getCodeSource().getLocation().getPath());
			vo.setVendor(s.getVendor());
			vo.setTool(StringUtils.countMatches(vo.getId(), ':') == 2);
			vo.setNodes(nodeRepository.countByRefined(s.getKey()));
			vo.setSubscriptions(subscriptionRepository.countByNode(s.getKey()));
			NodeResource.toVo(nodeRepository.findOne(s.getKey()));
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

		// Compare with the available plug-in implementing ServicePlugin
		event.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream().filter(s -> !plugins.containsKey(s.getKey())).sorted()
				.forEach(s -> {
					log.info("Installing the new plugin {} v{} ...", s.getKey(), getVersion(s));
					try {
						plugins.put(s.getKey(), configurePlugin(s));
					} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
						// Something happened
						log.error("Installing the new plugin {} v{} failed", s.getKey(), getVersion(s), e);
						throw new TechnicalException("Configuring the new plugin failed", e, s.getKey());
					}
				});

		// Second pass, handle the plug-in update/downgrade version
		event.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream().sorted().forEach(s -> {
			final Plugin plugin = plugins.get(s.getKey());
			final String newVersion = getVersion(s);
			try {
				if (!plugins.get(s.getKey()).getVersion().equals(newVersion)) {
					log.info("Updating the plugin {} v{} -> v{} ...", s.getKey(), plugin.getVersion(), newVersion);
					updatePlugin(s);
					plugin.setVersion(newVersion);
				}
			} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
				// Something happened
				log.error("Updating the plugin {} v{} -> v{} succeed", s.getKey(), getVersion(s), newVersion);
				throw new TechnicalException("Configuring the new plugin failed", e, s.getKey());
			}
		});
		log.info("Plugins are now configured");
	}

	/**
	 * Return a failsafe computed version of the given {@link FeaturePlugin}
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
		return java.nio.file.Files.getLastModifiedTime(Paths.get(plugin.getClass().getProtectionDomain().getCodeSource().getLocation().toURI()))
				.toString();
	}

	/**
	 * Update an existing plug-in by calling only {@link FeaturePlugin#update(String)}
	 * 
	 * @param plugin
	 *            The updated plug-in.
	 * @throws URISyntaxException
	 *             When the version resolution from modification date failed.
	 * @throws IOException
	 *             When the version resolution from modification date failed.
	 */
	private void updatePlugin(final FeaturePlugin plugin) throws IOException, URISyntaxException {
		plugin.update(getVersion(plugin));
	}

	/**
	 * Configure the new plug-in in this order :
	 * <ul>
	 * <li>The required entities for the plug-in are persisted. These entities are discovered from
	 * {@link FeaturePlugin#getInstalledEntities()} and related CSF files are load in the data base. Note that there is
	 * at least one {@link Node} records added and related to the plug-in key.</li>
	 * <li>The {@link FeaturePlugin#install()} callback is called</li>
	 * <li>A new {@link Plugin} is inserted to maintain the validated plug-in and version</li>
	 * </ul>
	 * 
	 * @param plugin
	 *            The newly discovered plug-in.
	 * @return The new {@link Plugin} entity to register.
	 * @throws IOException
	 *             When the CSV files import failed.
	 * @throws URISyntaxException
	 *             When the version resolution from modification date failed.
	 */
	private Plugin configurePlugin(final FeaturePlugin plugin) throws IOException, URISyntaxException {
		final List<Class<?>> installedEntities = plugin.getInstalledEntities();

		// Special process for service plug-ins
		if (plugin instanceof ServicePlugin && !installedEntities.contains(Node.class)) {
			// Persist the partial default node now for the bellow installation process
			nodeRepository.saveAndFlush(newNode((ServicePlugin) plugin));
		}

		// Insert the configuration entities of the plug-in
		for (Class<?> entityClass : installedEntities) {
			csvForJpa.insert("csv", entityClass, StandardCharsets.UTF_8.name());
		}

		// Notify the plug-in it is being installed
		plugin.install();

		final Plugin entity = new Plugin();
		entity.setKey(plugin.getKey());
		entity.setVersion(getVersion(plugin));
		repository.saveAndFlush(entity);
		return entity;
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
}
