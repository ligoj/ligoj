package org.ligoj.app.resource.plugin;

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
public class MavenSearchResultItem {
	/**
	 * Artifact name (Maven central representation)
	 */
	@JsonProperty("a")
	private String artifact;

	@JsonProperty("latestVersion")
	private String version;
}