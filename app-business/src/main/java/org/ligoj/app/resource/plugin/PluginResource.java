package org.ligoj.app.resource.plugin;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import javax.transaction.Transactional;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.ligoj.bootstrap.core.NamedBean;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import org.ligoj.bootstrap.core.SpringUtils;
import org.ligoj.app.api.ServicePlugin;
import org.ligoj.app.dao.NodeRepository;
import org.ligoj.app.dao.SubscriptionRepository;

/**
 * Manage plug-in life-cycle.
 */
@Path("/plugin")
@Component
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class PluginResource {

	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

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
			return vo;
		}).sorted(Comparator.comparing(NamedBean::getId)).collect(Collectors.toList());
	}
}
