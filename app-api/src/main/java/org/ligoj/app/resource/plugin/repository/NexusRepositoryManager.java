/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import org.ligoj.bootstrap.core.curl.CurlProcessor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import javax.cache.annotation.CacheRemoveAll;
import javax.cache.annotation.CacheResult;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Nexus repository manager.
 */
@Component
public class NexusRepositoryManager extends AbstractRemoteRepositoryManager {

	private static final String DEFAULT_ARTIFACT_URL = "https://oss.sonatype.org/service/local/repositories/releases/content/";
	private static final String DEFAULT_GROUP_ID = "org.ligoj.plugin";
	private static final String DEFAULT_SEARCH_URL = "https://oss.sonatype.org/service/local/lucene/search?collapseresults=true&repositoryId=releases&p=jar&c=sources&g=";

	@Override
	@CacheResult(cacheName = "plugins-last-version-nexus")
	public Map<String, Artifact> getLastPluginVersions() {
		try (var processor = new CurlProcessor(getSearchProxyHost(), getSearchProxyPort())) {
			final var searchResult = Objects.toString(
					processor.get(getSearchUrl(DEFAULT_SEARCH_URL + getGroupId(DEFAULT_GROUP_ID)), "Accept:application/json"), "{\"data\":[]}");
			// Extract artifacts
			final var jsonMapper = new ObjectMapper();
			return Arrays.stream(jsonMapper.treeToValue(jsonMapper.readTree(searchResult).at("/data"), NexusSearchResult[].class))
					.collect(Collectors.toMap(NexusSearchResult::getArtifact, ArtifactVo::new, (a1, _) -> a1));
		}
	}

	@Override
	public String getId() {
		return "nexus";
	}

	@Override
	public InputStream getArtifactInputStream(String groupId, String artifact, String version, String classifier) throws IOException {
		return getArtifactInputStream(groupId, artifact, version, DEFAULT_ARTIFACT_URL, classifier);
	}

	@Override
	@CacheRemoveAll(cacheName = "plugins-last-version-nexus")
	public void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
