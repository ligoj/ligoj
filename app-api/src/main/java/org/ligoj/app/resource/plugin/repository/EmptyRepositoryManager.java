/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import java.io.InputStream;
import java.util.Collections;
import java.util.Map;

/**
 * Nil repository manager.
 */
public class EmptyRepositoryManager implements RepositoryManager {

	@Override
	public Map<String, Artifact> getLastPluginVersions() {
		return Collections.emptyMap();
	}

	@Override
	public String getId() {
		return "empty";
	}

	@Override
	public InputStream getArtifactInputStream(String groupId, String artifact, String version, String classifier) {
		return null;
	}

}
