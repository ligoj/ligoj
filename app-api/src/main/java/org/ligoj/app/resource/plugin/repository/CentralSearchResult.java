/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Map;

/**
 * Result from maven search
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class CentralSearchResult implements Artifact {
	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Artifact name (Maven central representation)
	 */
	@JsonProperty("name")
	private String artifact;

	/**
	 * Full artifact's version.
	 */
	public String getVersion() {
		return (String) latestVersionInfo.get("version");
	}

	@JsonProperty("latestVersionInfo")
	private Map<String, Serializable> latestVersionInfo;
}