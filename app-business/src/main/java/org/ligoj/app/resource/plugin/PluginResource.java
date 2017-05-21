package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.persistence.EntityManager;
import javax.transaction.Transactional;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.ObjectUtils;
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
import org.ligoj.bootstrap.core.resource.BusinessException;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Persistable;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

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

	private static final String DEFAULT_PLUGIN_URL = "http://central.maven.org/maven2/org/ligoj/plugin/";

	private static final String DEFAULT_PLUGIN_SEARCH_URL = "http://search.maven.org/solrsearch/select?wt=json&rows=100&q=org.ligoj.plugin";

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private PluginRepository repository;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

	@Autowired
	protected CsvForJpa csvForJpa;

	@Autowired
	private ConfigurationResource configuration;

	@Autowired
	protected EntityManager em;

	/**
	 * Return the plug-ins download URL.
	 * 
	 * @return The plug-ins download URL. Ends with "/".
	 */
	private String getPluginUrl() {
		return StringUtils.appendIfMissing(ObjectUtils.defaultIfNull(configuration.get("plugins.url"), DEFAULT_PLUGIN_URL), "/");
	}

	/**
	 * Return the plug-ins search URL.
	 * 
	 * @return The plug-ins search URL.
	 */
	private String getPluginSearchUrl() {
		return ObjectUtils.defaultIfNull(configuration.get("plugins.search.url"), DEFAULT_PLUGIN_SEARCH_URL);
	}

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
			vo.setLocation(getPluginLocation(feature).getPath());
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
	 * Search plug-ins in repo which can be installed.
	 *
	 * @return All plug-ins artifacts name.
	 */
	@GET
	@Path("search")
	public List<String> search(@Context final UriInfo uriInfo) throws IOException {
		final String query = uriInfo.getQueryParameters().getFirst("q");
		final String searchResult = new CurlProcessor().get(getPluginSearchUrl());
		// extract artifacts
		final ObjectMapper jsonMapper = new ObjectMapper();
		return Arrays.stream(jsonMapper.treeToValue(jsonMapper.readTree(searchResult).at("/response/docs"), MavenSearchResultItem[].class))
				.map(MavenSearchResultItem::getA).filter(artifact -> artifact.contains(query)).collect(Collectors.toList());
	}

	/**
	 * Install the last available version of given plug-in from the remote server.
	 * 
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 */
	@POST
	@Path("{artifact:[\\w-]+}")
	public void install(@PathParam("artifact") final String artifact) {
		final String metaData = StringUtils.defaultString(new CurlProcessor().get(getPluginUrl() + artifact + "/maven-metadata.xml"), "");
		final Matcher matcher = Pattern.compile("<latest>([^<]+)</latest>").matcher(metaData);
		if (!matcher.find()) {
			// Plug-in not found
			throw new BusinessException(
					String.format("Versions discovery cannot be performed from the remote server %s for plugin %s", getPluginUrl(), artifact));
		}
		install(artifact, matcher.group(1));
	}

	/**
	 * Remove all versions the specified plug-in.
	 * 
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 */
	@DELETE
	@Path("{artifact:[\\w-]+}")
	public void remove(@PathParam("artifact") final String artifact) throws IOException {
		Files.list(getPluginClassLoader().getPluginDirectory()).filter(p -> p.getFileName().toString().matches("^" + artifact + "(-.*)?\\.jar$"))
				.forEach(p -> p.toFile().delete());
		log.info("Plugin {} has been deleted, restart is required", artifact);
	}

	/**
	 * Install the specific version of given plug-in from the remote server. The previous version is not deleted. The
	 * downloaded version will be used only if it is a most recent version than the locally ones.
	 * 
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version
	 *            The version to install.
	 */
	@POST
	@Path("{artifact:[\\w-]+}/{version:[\\w-]+}")
	public void install(@PathParam("artifact") final String artifact, @PathParam("version") final String version) {
		final String url = getPluginUrl() + artifact + "/" + version + "/" + artifact + "-" + version + ".jar";
		final java.nio.file.Path target = getPluginClassLoader().getPluginDirectory().resolve(artifact + "-" + version + ".jar");
		log.info("Downloading plugin {} v{} from {} to ", artifact, version, url);
		try {
			// Download and copy the file, note the previous version is not removed
			Files.copy(new URL(url).openStream(), target, StandardCopyOption.REPLACE_EXISTING);
			log.info("Plugin {} v{} has been downloaded, restart is required", artifact, version);
		} catch (final IOException ioe) {
			throw new BusinessException(artifact, String.format("Cannot be downloaded from remote server %s", artifact), ioe);
		}
	}

	protected PluginsClassLoader getPluginClassLoader() {
		return (PluginsClassLoader) Thread.currentThread().getContextClassLoader().getParent();
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
	public void refreshPlugins(final ContextRefreshedEvent event) throws Exception {
		// Get the existing plug-in features
		final Map<String, Plugin> plugins = repository.findAll().stream().collect(Collectors.toMap(Plugin::getKey, Function.identity()));

		// Changes, order by the related feature's key
		final Map<String, FeaturePlugin> newFeatures = new TreeMap<>();
		final Map<String, FeaturePlugin> updateFeatures = new TreeMap<>();
		final Set<Plugin> removedPlugins = new HashSet<>(plugins.values());

		// Compare with the available plug-in implementing ServicePlugin
		event.getApplicationContext().getBeansOfType(FeaturePlugin.class).values().stream().forEach(s -> {
			final Plugin plugin = plugins.get(s.getKey());
			if (plugin == null) {
				newFeatures.put(s.getKey(), s);
			} else if (!plugin.getVersion().equals(getVersion(s))) {
				updateFeatures.put(s.getKey(), s);
			}
			removedPlugins.remove(plugin);
		});

		// First install the data of new plug-ins
		updateFeatures.values().stream().forEach(s -> configurePluginUpdate(s, plugins.get(s.getKey())));
		newFeatures.values().stream().forEach(this::configurePluginInstall);

		// Then install/update the plug-in
		update(updateFeatures, plugins);
		install(newFeatures);
		log.info("Plugins are now configured");

		// And remove the old plug-in no more installed
		repository.deleteAll(removedPlugins.stream().map(Persistable::getId).collect(Collectors.toList()));
	}

	/**
	 * Install all ordered plug-ins.
	 */
	private void install(final Map<String, FeaturePlugin> newFeatures) throws Exception {
		for (final FeaturePlugin feature : newFeatures.values()) {
			feature.install();
		}
	}

	/**
	 * Update all ordered plug-ins.
	 */
	private void update(final Map<String, FeaturePlugin> updateFeatures, final Map<String, Plugin> plugins) throws Exception {
		for (Entry<String, FeaturePlugin> feature : updateFeatures.entrySet()) {
			feature.getValue().update(plugins.get(feature.getKey()).getVersion());
		}
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
	 *            The newly updated plug-in.
	 * @param entity
	 *            The current plug-in entity to update.
	 */
	protected void configurePluginUpdate(final FeaturePlugin plugin, final Plugin entity) {
		final String newVersion = getVersion(plugin);
		log.info("Updating the plugin {} v{} -> v{}", plugin.getKey(), entity.getVersion(), newVersion);
		entity.setVersion(newVersion);
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

			configurePluginEntities(plugin, installedEntities);

			entity.setKey(plugin.getKey());
			entity.setVersion(newVersion);
			repository.saveAndFlush(entity);
		} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
			// Something happened
			log.error("Installing the new plugin {} v{} failed", plugin.getKey(), newVersion, e);
			throw new TechnicalException(String.format("Configuring the new plugin %s failed", plugin.getKey()), e);
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

	/**
	 * Insert the configuration entities of the plug-in.
	 * 
	 * @param plugin
	 *            The related plug-in
	 * @param csvEntities
	 *            The managed entities where CSV data need to be persisted with this plug-in.
	 * @throws IOException
	 *             When the CSV management failed.
	 */
	protected void configurePluginEntities(final FeaturePlugin plugin, final List<Class<?>> csvEntities) throws IOException {
		//
		final ClassLoader classLoader = plugin.getClass().getClassLoader();

		// Compute the location of this plug-in, ensuring the
		final String pluginLocation = getPluginLocation(plugin).toString();
		for (final Class<?> entityClass : csvEntities) {
			// Build the required CSV file
			final String csv = "csv/"
					+ StringUtils.join(StringUtils.splitByCharacterTypeCamelCase(entityClass.getSimpleName()), '-').toLowerCase(Locale.ENGLISH)
					+ ".csv";
			configurePluginEntity(Collections.list(classLoader.getResources(csv)).stream(), entityClass, pluginLocation);
		}
	}

	/**
	 * Return the file system location corresponding to the given plug-in.
	 * 
	 * @param plugin
	 *            The related plug-in
	 * @return The URL corresponding to the location.
	 */
	protected URL getPluginLocation(final FeaturePlugin plugin) {
		return plugin.getClass().getProtectionDomain().getCodeSource().getLocation();
	}

	protected void configurePluginEntity(final Stream<URL> csv, final Class<?> entityClass, final String pluginLocation) throws IOException {
		InputStreamReader input = null;
		try { // NOSONAR - No Java7 feature because of coverage issues
				// Accept the CSV file only from the JAR/folder where the plug-in is installed from
			input = new InputStreamReader(csv.filter(u -> u.getPath().startsWith(pluginLocation) || u.toString().startsWith(pluginLocation))
					.findFirst()
					.orElseThrow(() -> new TechnicalException(String.format("Unable to find CSV file for entity %s", entityClass.getSimpleName())))
					.openStream(), StandardCharsets.UTF_8);

			// Build and save the entities managed by this plug-in
			csvForJpa.toJpa(entityClass, input, true, true);
			em.flush();
			em.clear();
		} finally {
			IOUtils.closeQuietly(input);
		}

	}

	/**
	 * Build a new {@link Node} from the given plug-in instance using the naming convention to link the parent.
	 * 
	 * @param service
	 *            The service plug-in to add as a node.
	 * @return The new {@link Node}
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
	 * @return The version from the MANIFEST or the timestamp. <code>?</code> when an error occurs.
	 */
	protected String getVersion(final FeaturePlugin plugin) {
		return Optional.ofNullable(plugin.getVersion()).orElseGet(() -> {
			// Not explicit version
			try {
				return getLastModifiedTime(plugin);
			} catch (final IOException | URISyntaxException e) {
				log.warn("Unable to determine the version of plug-in {}", plugin.getClass(), e);

				// Fail-safe version
				return "?";
			}
		});
	}
}
