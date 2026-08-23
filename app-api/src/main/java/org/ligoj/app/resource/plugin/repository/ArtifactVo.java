/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The view of an artifact.
 */
@Getter
@Setter
@NoArgsConstructor
public class ArtifactVo implements Artifact {
	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * ArtifactID
	 */
	private String artifact;

	/**
	 * Full version.
	 */
	private String version;

	/**
	 * Constructor for a copy of the given artifact
	 *
	 * @param artifact The artifact to clone.
	 */
	public ArtifactVo(final Artifact artifact) {
		this();
		setArtifact(artifact.getArtifact());
		setVersion(artifact.getVersion());
	}
}
