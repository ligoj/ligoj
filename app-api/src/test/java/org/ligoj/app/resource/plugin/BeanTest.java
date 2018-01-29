package org.ligoj.app.resource.plugin;

import org.junit.jupiter.api.Test;
import org.ligoj.app.model.PluginType;
import org.ligoj.app.resource.security.User;
import org.ligoj.bootstrap.model.AbstractBusinessEntityTest;

/**
 * Simple test of API beans.
 */
public class BeanTest extends AbstractBusinessEntityTest {

	/**
	 * Test equals and hash code operation with all possible combinations with only one identifier.
	 */
	@Test
	public void testEqualsAndHash() throws Exception {
		testEqualsAndHash(User.class, "name");
	}

	@Test
	public void testPluginType() {
		PluginType.valueOf(PluginType.values()[PluginType.FEATURE.ordinal()].name());
	}
}
