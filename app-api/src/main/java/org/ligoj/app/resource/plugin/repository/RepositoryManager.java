/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
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
	 * @throws IOException When index download failed.
	 */
	Map<String, Artifact> getLastPluginVersions() throws IOException;

	/**
	 * Return the repository manager identifier.
	 * 
	 * @return The repository manager identifier.
	 */
	String getId();

	/**
	 * Return the input stream corresponding to the remote artifact archive.
	 *
	 * @param groupId  The Maven groupId.
	 * @param artifact The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version  The version to install.
	 * @param classifier The jar classifier. May be null or empty.
	 * @return The opened {@link InputStream} of the artifact to download.
	 * @throws IOException When input cannot be opened.
	 */
	InputStream getArtifactInputStream(String groupId, String artifact, String version, String classifier) throws IOException;

	/**
	 * Invalid the possible version cache.
	 */
	default void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
