package org.ligoj.app.resource.plugin.repository;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.springframework.beans.factory.annotation.Autowired;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public abstract class AbstractRemoteRepositoryManager implements RepositoryManager {

	@Autowired
	protected ConfigurationResource configuration;

	/**
	 * Return the plug-ins search URL.
	 * 
	 * @param defaultUrl
	 *            The default URL.
	 * @return The plug-ins search URL.
	 */
	protected String getSearchUrl(final String defaultUrl) {
		return getConfiguration("search.url", defaultUrl);
	}

	/**
	 * Return the plug-ins download base URL.
	 * 
	 * @param defaultUrl
	 *            The default URL.
	 * @return The plug-ins download URL.
	 */
	protected String getArtifactlBaseUrl(final String defaultUrl) {
		return getConfiguration("artifact.url", defaultUrl);
	}

	/**
	 * Get the repository configuration or the default value if not configured.
	 * 
	 * @param suffix
	 *            The configuration key name suffix.
	 * @param defaultValue
	 *            The default configuration value.
	 * @return The configuration value. Default is the given "defaultValue" parameter.
	 */
	private String getConfiguration(final String suffix, final String defaultValue) {
		return ObjectUtils.defaultIfNull(configuration.get("plugins.repository-manager." + getId() + "." + suffix), defaultValue);

	}

	/**
	 * Return the plug-ins download URL.
	 * 
	 * @return The plug-ins download URL. Ends with "/".
	 */
	protected String getArtifactUrl(String artifact, String version, final String defaultUrl) {
		return StringUtils.appendIfMissing(getArtifactlBaseUrl(defaultUrl), "/") + artifact + "/" + version + "/" + artifact + "-" + version + ".jar";
	}

	/**
	 * Return the input stream from the remote URL.
	 * 
	 * @param artifact
	 *            The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version
	 *            The version to install.
	 * @param defaultArtifactUrl
	 *            The default artifact base URL.
	 * @return The opened {@link InputStream} of the artifact to download.
	 * @see #getArtifactlBaseUrl(String)
	 * @throws IOException
	 *             When download failed.
	 */
	public InputStream getArtifactInputStream(String artifact, String version, final String defaultArtifactUrl) throws IOException {
		final String url = getArtifactUrl(artifact, version, defaultArtifactUrl);
		log.info("Resolved remote URL is {}", url);
		return new URL(url).openStream();
	}

}
