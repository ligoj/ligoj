package org.ligoj.app.resource.plugin;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

/**
 * Result from maven search
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MavenSearchResultItem {
	/**
	 * artifact name (maven central reprentation)
	 */
	private String a;
}