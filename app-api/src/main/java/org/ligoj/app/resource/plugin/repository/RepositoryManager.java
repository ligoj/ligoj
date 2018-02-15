package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

public interface RepositoryManager {

	/**
	 * Query and get the last version of all available plug-ins.
	 * 
	 * @return All plug-ins with their last available version. Key is the plug-in identifier.
	 */
	Map<String, Artifact> getLastPluginVersions() throws IOException;

	/**
	 * Return the repository manager identifier.
	 * 
	 * @return The repository manager identifier.
	 */
	String getId();

	InputStream getArtifactInputStream(String artifact, String version) throws IOException;

	/**
	 * Invalid the possible version cache.
	 */
	default void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
