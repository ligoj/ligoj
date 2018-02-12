package org.ligoj.app.resource.plugin.repository;

/**
 * A Maven artifact.
 */
public interface Artifact {

	/**
	 * Artifact digit version. Not "LATEST",...
	 * 
	 * @return Artifact digit version. Not "LATEST",...
	 */
	String getVersion();

	/**
	 * Artifact identifier.
	 * 
	 * @return Artifact identifier.
	 */
	String getArtifact();
}
