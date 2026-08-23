/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.ligoj.bootstrap.core.curl.CurlProcessor;
import org.ligoj.bootstrap.resource.system.configuration.ConfigurationResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.URI;
import java.util.Objects;

/**
 * Base class for remote repository manager.
 */
@Slf4j
public abstract class AbstractRemoteRepositoryManager implements RepositoryManager {

	/**
	 * Injected configuration resource shared with child classes.
	 */
	@Autowired
	protected ConfigurationResource configuration;

	/**
	 * Return the plug-ins search URL.
	 *
	 * @param defaultUrl The default URL.
	 * @return The plug-ins search URL.
	 */
	protected String getSearchUrl(final String defaultUrl) {
		return getConfiguration("search.url", defaultUrl);
	}

	/**
	 * Return the proxy host used for search.
	 *
	 * @return The proxy host used for search.
	 */
	protected String getSearchProxyHost() {
		return getConfiguration("search.proxy.host", null);
	}

	/**
	 * Return the proxy host used for search.
	 *
	 * @return The proxy port used for search.
	 */
	protected int getSearchProxyPort() {
		return Integer.parseInt(StringUtils.defaultIfBlank(Objects.toString(getConfiguration("search.proxy.port", "8080")), "8080"));
	}

	/**
	 * Return the plug-ins filtered group-id to query the repository manager.
	 *
	 * @param defaultGroupIp The "groupId".
	 * @return The "groupId" filter.
	 */
	protected String getGroupId(final String defaultGroupIp) {
		return getConfiguration("groupId", defaultGroupIp);
	}

	/**
	 * Return the plug-ins download base URL.
	 *
	 * @param defaultUrl The default URL.
	 * @return The plug-ins download URL.
	 */
	protected String getArtifactBaseUrl(final String defaultUrl) {
		return getConfiguration("artifact.url", defaultUrl);
	}

	/**
	 * Return the proxy host used for download.
	 *
	 * @return The proxy host used for download.
	 */
	protected String getArtifactProxyHost() {
		return getConfiguration("artifact.proxy.host", null);
	}

	/**
	 * Return the proxy host used for download.
	 *
	 * @return The proxy port used for download.
	 */
	protected int getArtifactProxyPort() {
		return Integer.parseInt(StringUtils.defaultIfBlank(Objects.toString(getConfiguration("artifact.proxy.port", "8080")), "8080"));
	}

	/**
	 * Get the repository configuration or the default value if not configured.
	 *
	 * @param suffix       The configuration key name suffix.
	 * @param defaultValue The default configuration value.
	 * @return The configuration value. Default is the given "defaultValue" parameter.
	 */
	private String getConfiguration(final String suffix, final String defaultValue) {
		return StringUtils.defaultIfBlank(configuration.get("plugins.repository-manager." + getId() + "." + suffix, defaultValue), defaultValue);
	}

	/**
	 * Maven version qualifier identifying a snapshot. Snapshot artifacts are not published with a literal
	 * "-SNAPSHOT" file name but with a timestamped build version resolved from the {@code maven-metadata.xml} file.
	 */
	private static final String SNAPSHOT_SUFFIX = "-SNAPSHOT";

	/**
	 * Return the plug-ins download URL.
	 *
	 * @param groupId    The Maven groupID path.
	 * @param artifact   The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version    The version to install.
	 * @param defaultUrl The default artifact base URL.
	 * @param classifier The jar classifier. May be null or empty.
	 * @return The plug-ins download URL. Ends with "/".
	 */
	protected String getArtifactUrl(String groupId, String artifact, String version, final String defaultUrl, final String classifier) {
		// For "-SNAPSHOT" versions the directory keeps the snapshot version while the file uses the resolved build version
		final var fileVersion = getResolvedVersion(groupId, artifact, version, defaultUrl);
		return Strings.CS.appendIfMissing(getArtifactBaseUrl(defaultUrl), "/")
				+ groupId.replace('.', '/') + "/"
				+ artifact + "/" + version + "/"
				+ artifact + "-" + fileVersion
				+ (StringUtils.isBlank(classifier) ? "" : Strings.CS.prependIfMissing(classifier, "-"))
				+ ".jar";
	}

	/**
	 * Resolve the version used in the artifact file name. For a release version, the version is returned unchanged.
	 * For a "-SNAPSHOT" version, the actual timestamped build version is resolved from the remote
	 * {@code maven-metadata.xml} file (for instance <code>1.0.0-SNAPSHOT</code> becomes
	 * <code>1.0.0-20231201.123456-3</code>). When the metadata cannot be downloaded or parsed, the original
	 * "-SNAPSHOT" version is returned as a best effort.
	 *
	 * @param groupId    The Maven groupId.
	 * @param artifact   The Maven artifact identifier.
	 * @param version    The requested version, possibly ending with "-SNAPSHOT".
	 * @param defaultUrl The default artifact base URL.
	 * @return The version to use in the artifact file name.
	 */
	protected String getResolvedVersion(final String groupId, final String artifact, final String version, final String defaultUrl) {
		if (!Strings.CS.endsWith(version, SNAPSHOT_SUFFIX)) {
			// Release version, used as-is without any extra remote call
			return version;
		}
		final var metadataUrl = getArtifactMetadataUrl(groupId, artifact, version, defaultUrl);
		try (final var processor = new CurlProcessor(getArtifactProxyHost(), getArtifactProxyPort())) {
			final var metadata = processor.get(metadataUrl);
			if (StringUtils.isBlank(metadata)) {
				log.info("No snapshot metadata available at {}, falling back to literal version {}", metadataUrl, version);
				return version;
			}
			final var resolved = parseSnapshotVersion(metadata, version);
			log.info("Resolved snapshot version {} to {} from {}", version, resolved, metadataUrl);
			return resolved;
		}
	}

	/**
	 * Return the URL of the {@code maven-metadata.xml} file holding the snapshot build versions.
	 *
	 * @param groupId    The Maven groupId.
	 * @param artifact   The Maven artifact identifier.
	 * @param version    The snapshot version.
	 * @param defaultUrl The default artifact base URL.
	 * @return The {@code maven-metadata.xml} URL.
	 */
	protected String getArtifactMetadataUrl(final String groupId, final String artifact, final String version, final String defaultUrl) {
		return Strings.CS.appendIfMissing(getArtifactBaseUrl(defaultUrl), "/")
				+ groupId.replace('.', '/') + "/"
				+ artifact + "/" + version + "/maven-metadata.xml";
	}

	/**
	 * Parse the snapshot {@code maven-metadata.xml} content and resolve the timestamped build version. The build
	 * version is built from the base version and the {@code versioning/snapshot/timestamp} and
	 * {@code versioning/snapshot/buildNumber} elements. When these elements are missing, the original "-SNAPSHOT"
	 * version is returned.
	 *
	 * @param metadata The {@code maven-metadata.xml} content.
	 * @param version  The requested "-SNAPSHOT" version.
	 * @return The resolved build version, or the original version when the metadata cannot be parsed.
	 */
	private String parseSnapshotVersion(final String metadata, final String version) {
		try {
			final var factory = DocumentBuilderFactory.newInstance();
			// Harden the parser against XML external entity (XXE) attacks
			factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
			factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
			factory.setExpandEntityReferences(false);
			final var document = factory.newDocumentBuilder().parse(new InputSource(new StringReader(metadata)));
			final var timestamp = getFirstElementText(document, "timestamp");
			final var buildNumber = getFirstElementText(document, "buildNumber");
			if (timestamp != null && buildNumber != null) {
				return Strings.CS.removeEnd(version, SNAPSHOT_SUFFIX) + "-" + timestamp + "-" + buildNumber;
			}
			log.warn("Snapshot metadata has no timestamped build version, falling back to literal version {}", version);
		} catch (final Exception e) { // NOSONAR - Any parsing error falls back to the literal version
			log.warn("Unable to parse snapshot metadata, falling back to literal version {}", version, e);
		}
		return version;
	}

	/**
	 * Return the trimmed text content of the first element matching the given tag name, or <code>null</code> when
	 * absent or blank.
	 */
	private String getFirstElementText(final Document document, final String tagName) {
		final var nodes = document.getElementsByTagName(tagName);
		return nodes.getLength() == 0 ? null : StringUtils.trimToNull(nodes.item(0).getTextContent());
	}

	/**
	 * Return the input stream from the remote URL.
	 *
	 * @param groupId    The Maven groupId.
	 * @param artifact   The Maven artifact identifier and also corresponding to the plug-in simple name.
	 * @param version    The version to install.
	 * @param defaultUrl The default artifact base URL.
	 * @param classifier The jar classifier. May be null or empty.
	 * @return The opened {@link InputStream} of the artifact to download.
	 * @throws IOException When download failed.
	 * @see #getArtifactBaseUrl(String)
	 */
	public InputStream getArtifactInputStream(String groupId, String artifact, String version, final String defaultUrl, final String classifier)
			throws IOException {
		final var url = getArtifactUrl(groupId, artifact, version, defaultUrl, classifier);
		log.info("Resolved remote URL is {}", url);
		final var urlObj = URI.create(url).toURL();
		final var proxyHost = getArtifactProxyHost();
		final Proxy proxy;
		if (proxyHost == null) {
			proxy = Proxy.NO_PROXY;
		} else {
			proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, getArtifactProxyPort()));
		}
		return urlObj.openConnection(proxy).getInputStream();
	}

}
