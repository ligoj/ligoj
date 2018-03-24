/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import javax.cache.annotation.CacheRemoveAll;
import javax.cache.annotation.CacheResult;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.resource.plugin.CurlProcessor;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Nexus repository manager.
 */
@Component
public class NexusRepositoryManager extends AbstractRemoteRepositoryManager {

	private static final String DEFAULT_ARTIFACT_URL = "https://oss.sonatype.org/service/local/repositories/releases/content/org/ligoj/plugin";

	private static final String DEFAULT_SEARCH_URL = "https://oss.sonatype.org/service/local/lucene/search?g=org.ligoj.plugin&collapseresults=true&repositoryId=releases&p=jar&c=sources";

	@Override
	@CacheResult(cacheName = "plugins-last-version-nexus")
	public Map<String, Artifact> getLastPluginVersions() throws IOException {
		final String searchResult = StringUtils.defaultString(new CurlProcessor().get(getSearchUrl(DEFAULT_SEARCH_URL), "Accept:application/json"),
				"{\"data\":[]}");
		// Extract artifacts
		final ObjectMapper jsonMapper = new ObjectMapper();
		return Arrays.stream(jsonMapper.treeToValue(jsonMapper.readTree(searchResult).at("/data"), NexusSearchResult[].class))
				.collect(Collectors.toMap(NexusSearchResult::getArtifact, ArtifactVo::new, (a1, a2) -> a1));
	}

	@Override
	public String getId() {
		return "nexus";
	}

	@Override
	public InputStream getArtifactInputStream(String artifact, String version) throws IOException {
		return getArtifactInputStream(artifact, version, DEFAULT_ARTIFACT_URL);
	}

	@Override
	@CacheRemoveAll(cacheName = "plugins-last-version-nexus")
	public void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
