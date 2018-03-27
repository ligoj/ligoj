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
 * Maven central repository.
 */
@Component
public class CentralRepositoryManager extends AbstractRemoteRepositoryManager {

	private static final String DEFAULT_ARTIFACT_URL = "http://central.maven.org/maven2/org/ligoj/plugin/";
	private static final String DEFAULT_GROUP_ID = "org.ligoj.plugin";
	private static final String DEFAULT_SEARCH_URL = "http://search.maven.org/solrsearch/select?wt=json&rows=100&q=";

	@Override
	public String getId() {
		return "central";
	}

	@Override
	@CacheResult(cacheName = "plugins-last-version-central")
	public Map<String, Artifact> getLastPluginVersions() throws IOException {
		final String searchResult = StringUtils.defaultString(
				new CurlProcessor().get(getSearchUrl(DEFAULT_SEARCH_URL + getGroupId(DEFAULT_GROUP_ID))), "{\"response\":{\"docs\":[]}}}");
		// Extract artifacts
		final ObjectMapper jsonMapper = new ObjectMapper();
		return Arrays.stream(jsonMapper.treeToValue(jsonMapper.readTree(searchResult).at("/response/docs"), CentralSearchResult[].class))
				.collect(Collectors.toMap(CentralSearchResult::getArtifact, ArtifactVo::new));
	}

	@Override
	public InputStream getArtifactInputStream(String artifact, String version) throws IOException {
		return getArtifactInputStream(artifact, version, DEFAULT_ARTIFACT_URL);
	}

	@Override
	@CacheRemoveAll(cacheName = "plugins-last-version-central")
	public void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
