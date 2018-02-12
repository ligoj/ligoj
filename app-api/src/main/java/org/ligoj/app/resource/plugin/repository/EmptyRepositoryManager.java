package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.nio.file.Path;
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
	public void install(String artifact, String version, Path target) throws IOException {
		// Nothing to do
	}

}
