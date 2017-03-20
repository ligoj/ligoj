package org.ligoj.app.resource.plugin;

import java.io.IOException;

import javax.transaction.Transactional;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

/**
 * Test class of {@link PopulateResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class PopulateResourceTest {

	@Autowired
	private PopulateResource resource;

	@Test
	public void start() throws IOException {
		resource.setPopulate(false);
		resource.start();
		// Nothing happens
	}

	@Test
	public void startReset() throws IOException {
		resource.setPopulate(true);
		resource.start();
		// Populate without error
	}
}
