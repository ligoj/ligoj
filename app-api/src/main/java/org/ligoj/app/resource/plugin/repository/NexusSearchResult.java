package org.ligoj.app.resource.plugin.repository;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

/**
 * Result from maven search
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class NexusSearchResult implements Artifact {
	@JsonProperty("artifactId")
	private String artifact;

	@JsonProperty("latestRelease")
	private String version;
}