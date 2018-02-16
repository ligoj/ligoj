package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 * Repository manager.
 */
public interface RepositoryManager {

	/**
	 * Query and get the last version of all available plug-ins.
	 * 
	 * @return All plug-ins with their last available version. Key is the plug-in identifier.
	 * @throws IOException
	 *             When index download failed.
	 */
	Map<String, Artifact> getLastPluginVersions() throws IOException;

	/**
	 * Return the repository manager identifier.
	 * 
	 * @return The repository manager identifier.
	 */
	String getId();

	/**
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version
	 *            The version to install.
	 * @return The opened {@link InputStream} of the artifact to download.
	 * @throws IOException
	 *             When input cannot be opened.
	 */
	InputStream getArtifactInputStream(String artifact, String version) throws IOException;

	/**
	 * Invalid the possible version cache.
	 */
	default void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
