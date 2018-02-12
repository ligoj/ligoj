package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.nio.file.Path;
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

	/**
	 * Install the specific version of given plug-in from the remote server. The previous version is not deleted. The
	 * downloaded version will be used only if it is a most recent version than the locally ones.
	 * 
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version
	 *            The version to install.
	 * @param target
	 *            The target file name to write.
	 * @throws IOException
	 *             When download failed.
	 */
	void install(String artifact, String version, Path target) throws IOException;

	/**
	 * Invalid the possible version cache.
	 */
	default void invalidateLastPluginVersions() {
		// Nothing to do
	}

}
