/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.Map;

/**
 * Nil repository manager.
 */
public class EmptyRepositoryManager implements RepositoryManager {

	@Override
	public Map<String, Artifact> getLastPluginVersions() throws IOException {
		return Collections.emptyMap();
	}

	@Override
	public String getId() {
		return "empty";
	}

	@Override
	public InputStream getArtifactInputStream(String artifact, String version) throws IOException {
		return null;
	}

}
