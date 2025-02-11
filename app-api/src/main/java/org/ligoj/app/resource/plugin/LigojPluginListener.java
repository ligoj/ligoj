/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.api.SubscriptionMode;
import org.ligoj.app.api.ToolPlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.SubscriptionRepository;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Subscription;
import org.ligoj.app.resource.node.NodeHelper;
import org.ligoj.bootstrap.core.plugin.FeaturePlugin;
import org.ligoj.bootstrap.core.plugin.PluginListener;
import org.ligoj.bootstrap.core.plugin.PluginVo;
import org.ligoj.bootstrap.core.resource.TechnicalException;
import org.ligoj.bootstrap.model.system.SystemPlugin;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.function.Supplier;

/**
 * Plug-in life-cycle extension for Ligoj.
 */
@Component
public class LigojPluginListener implements PluginListener {

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

	@Override
	public Supplier<PluginVo> toVo() {
		return LigojPluginVo::new;
	}

	@Override
	public void fillVo(final SystemPlugin entity, final FeaturePlugin plugin, final PluginVo vo) {
		// Node statistics only for nodes
		if (!"FEATURE".equals(entity.getType())) {
			// This is a node (service or tool) add statistics and details
			final var lvo = (LigojPluginVo) vo;
			final var key = entity.getKey();
			lvo.setNodes(nodeRepository.countByRefined(key));
			lvo.setSubscriptions(subscriptionRepository.countByNode(key));
			lvo.setNode(NodeHelper.toVo(nodeRepository.findOne(key)));
		}
	}

	@Override
	public boolean install(FeaturePlugin feature) {
		return !nodeRepository.existsById(feature.getKey());
	}

	/**
	 * Return the current plug-in class loader.
	 *
	 * @return The current plug-in class loader.
	 */
	protected LigojPluginsClassLoader getPluginClassLoader() {
		return LigojPluginsClassLoader.getInstance();
	}

	/**
	 * Get a file reference for a specific subscription. This file will use the
	 * subscription as a context to isolate it, and using the related node and
	 * the subscription's identifier. The parent directory is created as needed.
	 *
	 * @param subscription
	 *            The subscription used a context of the file to create.
	 * @param fragments
	 *            The file fragments.
	 * @return The file reference.
	 * @throws IOException
	 *             When the file creation failed.
	 */
	public File toFile(final Subscription subscription, final String... fragments) throws IOException {
		var parent = toPath(getPluginClassLoader().getHomeDirectory(), subscription.getNode());
		parent = parent.resolve(String.valueOf(subscription.getId()));

		// Ensure the t
		for (var fragment : fragments) {
			parent = parent.resolve(fragment);
		}
		FileUtils.forceMkdir(parent.getParent().toFile());
		return parent.toFile();
	}

	/**
	 * Convert a {@link Node} to a {@link java.nio.file.Path} inside the given parent
	 * directory.
	 *
	 * @param parent
	 *            The parent path.
	 * @param node
	 *            The related node.
	 * @return The computed sibling path.
	 */
	private java.nio.file.Path toPath(final Path parent, final Node node) {
		return (node.isRefining() ? toPath(parent, node.getRefined()) : parent).resolve(toFragmentId(node).replace(':', '-'));
	}

	/**
	 * Return the last part of the node identifier, excluding the part of the
	 * parent. Built like that :
	 * <ul>
	 * <li>node = 'service:id:ldap:ad1', fragment = 'ad1'</li>
	 * <li>node = 'service:id:ldap', fragment = 'ldap'</li>
	 * <li>node = 'service:id', fragment = 'service:id'</li>
	 * </ul>
	 *
	 * @param node
	 *            The node to convert to a simple fragment String.
	 * @return The simple fragment.
	 */
	private String toFragmentId(final Node node) {
		return node.isRefining() ? node.getId().substring(node.getRefined().getId().length() + 1) : node.getId();
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
		final var result = PluginType.values()[StringUtils.countMatches(plugin.getKey(), ':')];

		// Double-check the convention with related interface
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
	 * Build a new {@link Node} from the given plug-in instance using the naming convention to link the parent.
	 *
	 * @param service
	 *            The service plug-in to add as a node.
	 * @return The new {@link Node}
	 */
	protected Node newNode(final ServicePlugin service) {
		final var node = new Node();
		node.setId(service.getKey());
		node.setName(service.getName());

		// Add default values
		node.setTag("functional");
		node.setTagUiClasses("fas fa-suitcase");
		node.setMode(SubscriptionMode.LINK);
		node.setUiClasses("$" + service.getName());

		// Link to the parent
		node.setRefined(getParentNode(service.getKey()));

		return node;
	}

	/**
	 * Return the parent node from a key. The node entity is retrieved from the database without cache.
	 *
	 * @param key
	 *            The plug-in key.
	 * @return the parent node entity or <code>null</code> when this the top most definition. Note if there is an
	 *         expected parent by convention, and the parent is not found, an error will be raised.
	 */
	protected Node getParentNode(final String key) {
		final var parentKey = StringUtils.substringBeforeLast(key, ":");
		if (parentKey.indexOf(':') == -1) {
			// Was already the top most parent
			return null;
		}

		// The closest parent has been found by convention, must be available in database
		return nodeRepository.findOneExpected(parentKey);
	}

	@Override
	public void configure(FeaturePlugin plugin, SystemPlugin entity) {
		final var type = plugin instanceof ServicePlugin p ? determinePluginType(p) : PluginType.FEATURE;
		entity.setType(type.name());

		// Manage disable then re-enable base with double install
		if (type != PluginType.FEATURE && !plugin.getInstalledEntities().contains(Node.class) && !nodeRepository.existsById(plugin.getKey())) {
			// This feature has not previously been installed
			// Persist the partial default node now for the bellow installation process
			nodeRepository.saveAndFlush(newNode((ServicePlugin) plugin));
		}

	}

}
