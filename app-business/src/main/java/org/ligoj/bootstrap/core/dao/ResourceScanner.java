package org.ligoj.bootstrap.core.dao;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.hibernate.boot.archive.scan.internal.StandardScanner;
import org.hibernate.boot.archive.scan.spi.ScanEnvironment;
import org.hibernate.boot.archive.scan.spi.ScanOptions;
import org.hibernate.boot.archive.scan.spi.ScanParameters;
import org.hibernate.boot.archive.scan.spi.ScanResult;

/**
 * Special scanner handling the VFS protocol.
 * 
 * @author Fabrice Daugan
 */
public class ResourceScanner extends StandardScanner {

	/**
	 * ORM file path.
	 */
	public static final String META_INF_ORM_XML = "META-INF/orm.xml";

	/**
	 * Perform the scanning against the described persistence unit using the defined options, and return the scan
	 * results.
	 * 
	 * @param scanOptions
	 *            The scan options
	 * @return The scan results.
	 */
	@Override
	public ScanResult scan(final ScanEnvironment environment, final ScanOptions scanOptions, final ScanParameters parameters) {

		try {
			final Set<URL> urls = new LinkedHashSet<>(environment.getNonRootUrls()); // NOSONAR - Requested by Hibernate
			urls.addAll(Collections.list(getOrmUrls()).stream().map(this::getJarUrlSafe).collect(Collectors.toList()));

			// Remove the root URL from the non root list
			urls.remove(environment.getRootUrl());

			// Replace the URL with the new set
			environment.getNonRootUrls().clear();
			environment.getNonRootUrls().addAll(urls);
			return super.scan(environment, scanOptions, parameters);
		} catch (final IOException e) {
			throw new IllegalStateException("Unable to read ORM Jars", e);
		}
	}

	/**
	 * Get the ORM {@link URL} from the JAR and managing the IO errors
	 */
	private URL getJarUrlSafe(final URL ormUrl) {
		try {
			return getJarUrl(ormUrl);
		} catch (final MalformedURLException e) {
			throw new IllegalStateException("Unable to read ORM file from jar", e);
		}
	}

	/**
	 * Return JAR URL from ORM URL.
	 * 
	 * @param ormUrl
	 *            ORM URL.
	 * @return the URL of JAR containing the given ORM file.
	 * @throws MalformedURLException
	 *             if JAR URL cannot be built from the ORM.
	 */
	protected URL getJarUrl(final URL ormUrl) throws MalformedURLException {
		final URL ormJarUrl;
		final String urlStr = ormUrl.toString();
		if ("jar".equals(ormUrl.getProtocol())) {
			if (StringUtils.countMatches(ormUrl.getPath(), "!") > 1) {
				// Cascaded JAR URL, remove only the last fragment
				ormJarUrl = new URL(urlStr.substring(0, urlStr.lastIndexOf('!')));
			} else {
				// Extract the jar containing this file
				ormJarUrl = new URL("file", ormUrl.getHost(), ormUrl.getPath().substring("file:".length(), ormUrl.getPath().indexOf('!')));
			}
		} else {
			// Remove the trailing path
			ormJarUrl = new URL(urlStr.substring(0, urlStr.length() - META_INF_ORM_XML.length() - 1));
		}
		return ormJarUrl;
	}

	/**
	 * Return existing ORM resources.
	 * 
	 * @return existing ORM resources found in class-path.
	 * @throws IOException
	 *             from {@link ClassLoader#getResources(String)}
	 */
	protected Enumeration<URL> getOrmUrls() throws IOException {
		return Thread.currentThread().getContextClassLoader().getResources(META_INF_ORM_XML);
	}

}
