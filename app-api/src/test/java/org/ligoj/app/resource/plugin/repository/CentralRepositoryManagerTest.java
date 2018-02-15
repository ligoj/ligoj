package org.ligoj.app.resource.plugin.repository;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import javax.transaction.Transactional;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.bootstrap.model.system.SystemConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test class of {@link CentralRepositoryManager}
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class CentralRepositoryManagerTest extends AbstractServerTest {

	protected static final String USER_HOME_DIRECTORY = "target/test-classes/home-test";

	@Autowired
	private CentralRepositoryManager resource;

	@BeforeEach
	public void prepareData() throws IOException {
		persistEntities("csv", new Class[] { SystemConfiguration.class, Node.class, Project.class, Subscription.class },
				StandardCharsets.UTF_8.name());
	}

	@Test
	public void invalidateLastPluginVersions() throws IOException {
		httpServer.stubFor(get(urlEqualTo("/solrsearch/select?wt=json&rows=100&q=org.ligoj.plugin"))
				.willReturn(aResponse().withStatus(HttpStatus.SC_OK).withBody(
						IOUtils.toString(new ClassPathResource("mock-server/maven-repo/search.json").getInputStream(), StandardCharsets.UTF_8))));
		httpServer.start();
		final Map<String, Artifact> versions = resource.getLastPluginVersions();
		Assertions.assertSame(versions, resource.getLastPluginVersions());
		resource.invalidateLastPluginVersions();
		Assertions.assertNotSame(versions, resource.getLastPluginVersions());
	}
}
