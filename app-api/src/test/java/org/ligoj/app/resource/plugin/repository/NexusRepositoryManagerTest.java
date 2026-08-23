/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import org.apache.commons.io.IOUtils;
import org.apache.hc.core5.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.bootstrap.AbstractServerTest;
import org.ligoj.bootstrap.model.system.SystemConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * Test class of {@link NexusRepositoryManager}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
class NexusRepositoryManagerTest extends AbstractServerTest {

	@Autowired
	private NexusRepositoryManager resource;

	@BeforeEach
	void prepareData() throws IOException {
		persistEntities("csv-test", new Class<?>[]{SystemConfiguration.class}, StandardCharsets.UTF_8);
	}

	@Test
	void invalidateLastPluginVersions() throws IOException {
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/lucene/search?g=org.ligoj.plugin&collapseresults=true&repositoryId=releases&p=jar&c=sources"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK)
						.withBody(IOUtils.toString(
								new ClassPathResource("mock-server/nexus-repo/search.json").getInputStream(),
								StandardCharsets.UTF_8))));
		httpServer.start();
		final var versions = resource.getLastPluginVersions();
		Assertions.assertEquals(versions.keySet(), resource.getLastPluginVersions().keySet());
		Assertions.assertEquals(2, versions.size());
		Assertions.assertEquals("0.0.1", versions.get("plugin-sample").getVersion());
		resource.invalidateLastPluginVersions();
		Assertions.assertEquals(versions.keySet(), resource.getLastPluginVersions().keySet());
	}

	@Test
	void getArtifactInputStreamSnapshot() throws IOException {
		// The "-SNAPSHOT" version is resolved to its timestamped build version from the metadata file
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/maven-metadata.xml"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK)
						.withBody(IOUtils.toString(
								new ClassPathResource("mock-server/nexus-repo/maven-metadata.xml").getInputStream(),
								StandardCharsets.UTF_8))));
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/plugin-sample-1.0.0-20231201.123456-3.jar"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("SNAPSHOT-OK")));
		httpServer.start();

		try (InputStream stream = resource.getArtifactInputStream("org.ligoj.plugin", "plugin-sample", "1.0.0-SNAPSHOT", null)) {
			Assertions.assertEquals("SNAPSHOT-OK", IOUtils.toString(stream, StandardCharsets.UTF_8));
		}
	}

	@Test
	void getArtifactInputStreamSnapshotNoBuildNumber() throws IOException {
		// Metadata with a timestamp but no buildNumber: fall back to the literal version
		assertArtifactInputStreamSnapshotNoBuildNumber__("<metadata><versioning><snapshot><timestamp>20231201.123456</timestamp></snapshot></versioning></metadata>");
	}


	private void assertArtifactInputStreamSnapshotNoBuildNumber__(String metadata) throws IOException {
		// Metadata with a timestamp but no buildNumber: fall back to the literal version
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/maven-metadata.xml"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody(metadata)));
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/plugin-sample-1.0.0-SNAPSHOT.jar"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("LITERAL-OK")));
		httpServer.start();

		try (InputStream stream = resource.getArtifactInputStream("org.ligoj.plugin", "plugin-sample", "1.0.0-SNAPSHOT", null)) {
			Assertions.assertEquals("LITERAL-OK", IOUtils.toString(stream, StandardCharsets.UTF_8));
		}
	}

	@Test
	void getArtifactInputStreamSnapshotNoTimestamp() throws IOException {
		// Metadata without any timestamped snapshot block: fall back to the literal version
		assertArtifactInputStreamSnapshotNoBuildNumber__("<metadata><versioning/></metadata>");
	}

	@Test
	void getArtifactInputStreamSnapshotMalformedMetadata() throws IOException {
		// Unparsable metadata: fall back to the literal version
		assertArtifactInputStreamSnapshotNoBuildNumber__("not-a-xml");
	}

	@Test
	void getArtifactInputStreamSnapshotNoMetadata() throws IOException {
		// When the metadata is not available, the literal "-SNAPSHOT" version is used as a best effort
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/maven-metadata.xml"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_NOT_FOUND)));
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0-SNAPSHOT/plugin-sample-1.0.0-SNAPSHOT.jar"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("LITERAL-OK")));
		httpServer.start();

		try (InputStream stream = resource.getArtifactInputStream("org.ligoj.plugin", "plugin-sample", "1.0.0-SNAPSHOT", null)) {
			Assertions.assertEquals("LITERAL-OK", IOUtils.toString(stream, StandardCharsets.UTF_8));
		}
	}

	@Test
	void getArtifactInputStreamRelease() throws IOException {
		// A release version is downloaded directly without any metadata resolution
		httpServer.stubFor(get(urlEqualTo(
				"/service/local/repositories/releases/content/org/ligoj/plugin/plugin-sample/1.0.0/plugin-sample-1.0.0.jar"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody("RELEASE-OK")));
		httpServer.start();

		try (InputStream stream = resource.getArtifactInputStream("org.ligoj.plugin", "plugin-sample", "1.0.0", null)) {
			Assertions.assertEquals("RELEASE-OK", IOUtils.toString(stream, StandardCharsets.UTF_8));
		}
	}
}
