package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
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
public class CentralRepositoryManager extends AbstractRepositoryManager {

	private static final String DEFAULT_ARTIFACT_URL = "http://central.maven.org/maven2/org/ligoj/plugin/";

	private static final String DEFAULT_SEARCH_URL = "http://search.maven.org/solrsearch/select?wt=json&rows=100&q=org.ligoj.plugin";

	@Override
	public String getId() {
		return "central";
	}

	@Override
	@CacheResult(cacheName = "plugins-last-version-central")
	public Map<String, Artifact> getLastPluginVersions() throws IOException {
		final String searchResult = StringUtils.defaultString(new CurlProcessor().get(getSearchUrl(DEFAULT_SEARCH_URL)),
				"{\"response\":{\"docs\":[]}}}");
		// Extract artifacts
		final ObjectMapper jsonMapper = new ObjectMapper();
		return Arrays.stream(jsonMapper.treeToValue(jsonMapper.readTree(searchResult).at("/response/docs"), CentralSearchResult[].class))
				.collect(Collectors.toMap(CentralSearchResult::getArtifact, Function.identity()));
	}

	@Override
	public void install(String artifact, String version, Path target) throws IOException {
		install(artifact, version, target, DEFAULT_ARTIFACT_URL);
	}

	@Override
	@CacheRemoveAll(cacheName = "plugins-last-version-central")
	public void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
