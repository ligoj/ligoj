package org.ligoj.app.resource.session;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.transaction.Transactional;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.dao.MessageRepository;
import org.ligoj.app.plugin.id.resource.CompanyResource;
import org.ligoj.app.resource.node.NodeResource;
import org.ligoj.bootstrap.core.json.ObjectMapperTrim;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.ligoj.bootstrap.resource.system.session.ISessionSettingsProvider;
import org.ligoj.bootstrap.resource.system.session.SessionSettings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;

import lombok.extern.slf4j.Slf4j;

/**
 * Session resource.
 */
@Component
@Slf4j
@Transactional
public class ToolSessionSettingsProvider implements ISessionSettingsProvider {

	@Autowired
	private ConfigurationResource configuration;
	@Autowired
	private CompanyResource companyResource;

	@Autowired
	private MessageRepository messageRepository;

	@Autowired
	private ObjectMapperTrim objectMapper;

	@Autowired
	private NodeResource nodeResource;

	private static final TypeReference<List<Map<String, Object>>> LIST_MAP_TYPE = new TypeReference<List<Map<String, Object>>>() {
		// Nothing to do
	};

	@Override
	public void decorate(final SessionSettings settings) {
		final Map<String, Object> userSetting = settings.getUserSettings();

		// Add the related one to the type of user
		final String source;
		if (companyResource.isUserInternalCommpany()) {
			// Internal user
			userSetting.put("internal", Boolean.TRUE);
			source = configuration.get("global.tools.internal");
		} else {
			// External user
			userSetting.put("external", Boolean.TRUE);
			source = configuration.get("global.tools.external");
		}

		// Fetch the required node data
		try {
			final List<Map<String, Object>> rawGlobalTools = objectMapper.readValue(StringUtils.defaultIfEmpty(source, "[]"), LIST_MAP_TYPE);
			// Replace the node identifier by a Node instance
			userSetting.put("globalTools", rawGlobalTools.stream().map(globalTool -> {
				// When the node does not exist anymore, the configuration is not returned
				globalTool.compute("node", (node, v) -> nodeResource.findAll().get(globalTool.get("id")));
				globalTool.remove("id");
				return globalTool;
			}).filter(globalTool -> globalTool.containsKey("node")).collect(Collectors.toList()));
		} catch (final IOException ioe) {
			log.error("Unable to write the global tools configuration for user {}", settings.getUserName(), ioe);
		}

		// Add the unread messages counter
		userSetting.put("unreadMessages", messageRepository.countUnread(settings.getUserName()));
	}
}
