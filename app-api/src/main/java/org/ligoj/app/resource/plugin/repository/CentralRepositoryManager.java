/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import jakarta.ws.rs.HttpMethod;
import org.ligoj.bootstrap.core.curl.CurlProcessor;
import org.ligoj.bootstrap.core.curl.CurlRequest;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import javax.cache.annotation.CacheRemoveAll;
import javax.cache.annotation.CacheResult;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Maven central repository.
 */
@Component
public class CentralRepositoryManager extends AbstractRemoteRepositoryManager {

	private static final String DEFAULT_ARTIFACT_URL = "https://repo.maven.apache.org/maven2/";
	private static final String DEFAULT_GROUP_ID = "org.ligoj.plugin";

	// See https://central.sonatype.com/api/internal/browse/components
	private static final String DEFAULT_SEARCH_URL = "https://central.sonatype.com/api/internal/browse/components";

	@Override
	public String getId() {
		return "central";
	}

	@CacheResult(cacheName = "plugins-last-version-central")
	public Map<String, Artifact> getLastPluginVersions() {
		var result = new HashMap<String, Artifact>();
		try (var processor = new CurlProcessor(getSearchProxyHost(), getSearchProxyPort())) {
			var page = 0;
			final var groupId = getGroupId(DEFAULT_GROUP_ID);
			final var jsonMapper = new ObjectMapper();
			var components = new CentralSearchResult[0];
			do {
				final var request = new CurlRequest(HttpMethod.POST, getSearchUrl(DEFAULT_SEARCH_URL),
						"{\"page\":" + page + ",\"size\":20,\"searchTerm\":\"\",\"sortField\":\"publishedDate\",\"sortDirection\":\"desc\",\"filter\":[\"namespace:"
								+ groupId + "\"]}",
						"content-type:application/json");
				request.setSaveResponse(true);
				processor.process(request);
				final var searchResult = Objects.toString(request.getResponse(), "{\"components\":[]}");
				// Extract artifacts
				final var tree = jsonMapper.readTree(searchResult);
				components = jsonMapper.treeToValue(tree.at("/components"), CentralSearchResult[].class);
				for (var r : components) {
					result.put(r.getArtifact(), new ArtifactVo(r));
				}
				page++;
			} while (components.length > 0);
		}
		return result;
	}


	@Override
	public InputStream getArtifactInputStream(String groupId, String artifact, String version, final String classifier) throws IOException {
		return getArtifactInputStream(groupId, artifact, version, DEFAULT_ARTIFACT_URL, classifier);
	}

	@Override
	@CacheRemoveAll(cacheName = "plugins-last-version-central")
	public void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
