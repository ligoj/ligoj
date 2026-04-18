/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.core.dao;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.hibernate.archive.scan.internal.StandardScanner;
import org.hibernate.boot.archive.scan.spi.ScanEnvironment;
import org.hibernate.boot.archive.scan.spi.ScanOptions;
import org.hibernate.boot.archive.scan.spi.ScanParameters;
import org.hibernate.boot.archive.scan.spi.ScanResult;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;

/**
 * Special scanner handling the VFS protocol.
 *
 * @author Fabrice Daugan
 */
@Slf4j
public class ResourceScanner extends StandardScanner {

	/**
	 * ORM file path.
	 */
	public static final String META_INF_ORM_XML = "META-INF/orm.xml";

	/**
	 * Perform the scanning against the described persistence unit using the defined options, and return the scan
	 * results.
	 *
	 * @param scanOptions The scan options
	 * @return The scan results.
	 */
	@Override
	public ScanResult scan(final ScanEnvironment environment, final ScanOptions scanOptions, final ScanParameters parameters) {

		try {
			final var urls = new LinkedHashSet<>(environment.getNonRootUrls()); // NOSONAR - Requested by Hibernate
			urls.addAll(Collections.list(getOrmUrls()).stream().map(this::getJarUrlSafe).toList());

			// Remove the root URL from the non-root list
			//noinspection UrlHashCode
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
		} catch (final Exception e) {
			throw new IllegalStateException("Unable to read ORM file '" + ormUrl + "' from jar", e);
		}
	}

	/**
	 * Return JAR URL from ORM URL.
	 *
	 * @param ormUrl ORM URL.
	 * @return the URL of JAR containing the given ORM file.
	 * @throws MalformedURLException if JAR URL cannot be built from the ORM.
	 */
	protected URL getJarUrl(final URL ormUrl) throws MalformedURLException {
		final URI ormJarUrl;
		final var urlStr = ormUrl.toString();
		if ("jar".equals(ormUrl.getProtocol())) {
			ormJarUrl = URI.create(StringUtils.substringBeforeLast(urlStr.replace("jar:",""), "!"));
		} else {
			// Remove the trailing path
			log.debug("Hibernate ORM, remove trailing /orm.xml from {}", ormUrl);
			ormJarUrl = URI.create(urlStr.substring(0, urlStr.length() - META_INF_ORM_XML.length() - 1));
		}
		log.info("Resolved JAR URL: '{}' from ORM URL '{}'({})", ormJarUrl, ormUrl,ormUrl.getProtocol());
		return ormJarUrl.toURL();
	}

	/**
	 * Return existing ORM resources.
	 *
	 * @return existing ORM resources found in class-path.
	 * @throws IOException from {@link ClassLoader#getResources(String)}
	 */
	protected Enumeration<URL> getOrmUrls() throws IOException {
		return Thread.currentThread().getContextClassLoader().getResources(META_INF_ORM_XML);
	}

}
