package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.transaction.Transactional;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.api.NodeVo;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.api.SubscriptionMode;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.SubscriptionRepository;
import org.ligoj.app.model.Node;
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
	private NodeResource nodeResource;

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
		return SpringUtils.getApplicationContext().getBeansOfType(ServicePlugin.class).values().stream().map(s -> {
			final PluginVo vo = new PluginVo();
			vo.setId(s.getKey());
			vo.setName(s.getName());
			vo.setVersion(s.getVersion());
			vo.setVendor(s.getVendor());
			vo.setTool(StringUtils.countMatches(vo.getId(), ':') == 2);
			vo.setNodes(nodeRepository.countByRefined(s.getKey()));
			vo.setSubscriptions(subscriptionRepository.countByNode(s.getKey()));
			NodeResource.toVo(nodeRepository.findOne(s.getKey()));
			return vo;
		}).sorted(Comparator.comparing(NamedBean::getId)).collect(Collectors.toList());
	}

	/**
	 * Handle the newly installed plug-ins implementing {@link ServicePlugin}. Note the plug-ins are installed in a
	 * natural order based on their key name to ensure the parents plug-ins are configured first. Note the transactional
	 * behavior, if one plug-in failed to be configured, the entire process is cancelled, the previously and the not
	 * process plug'in discovered during this process are not configured.
	 * 
	 * @param event
	 *            The Spring event.
	 */
	@EventListener
	public void refreshNodes(final ContextRefreshedEvent event) {
		// Get the existing nodes
		final Map<String, NodeVo> nodes = nodeResource.findAll();

		// Compare with the available plug-in implementing ServicePlugin
		event.getApplicationContext().getBeansOfType(ServicePlugin.class).values().stream().filter(s -> !nodes.containsKey(s.getKey())).sorted()
				.forEach(s -> {
					log.info("Configuring the new plugin {} v{}", s.getKey(), s.getVersion());
					try {
						configurePlugin(s);

						// Plug-in is configured
						log.info("Configuring the new plugin {} v{} succeed");
					} catch (final Exception e) { // NOSONAR - Catch all to notice every time the failure
						// Something happened
						log.info("Configuring the new plugin {} v{} failed", s.getKey(), s.getVersion(), e);
						throw new TechnicalException("Configuring the new plugin failed", e, s.getKey());
					}
				});
	}

	private void configurePlugin(final ServicePlugin s) throws IOException {
		final List<Class<?>> installedEntities = s.getInstalledEntities();
		if (!installedEntities.contains(Node.class)) {
			// Persist the partial default node now for the bellow installation process
			nodeRepository.saveAndFlush(newNode(s));
		}

		// Insert the configuration entities of the plug-in
		for (Class<?> entityClass : installedEntities) {
			csvForJpa.insert("csv", entityClass, StandardCharsets.UTF_8.name());
		}

		// Notify the plug-in it is being installed
		s.install(nodeRepository.findOneExpected(s.getKey()));
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
