/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.junit.jupiter.api.Test;
import org.ligoj.app.resource.security.User;
import org.ligoj.bootstrap.model.AbstractBusinessEntityTest;

/**
 * Simple test of API beans.
 */
class BeanTest extends AbstractBusinessEntityTest {

	/**
	 * Test equals and hash code operation with all possible combinations with only one identifier.
	 */
	@Test
	void testEqualsAndHash() throws Exception {
		testEqualsAndHash(User.class, "name");
	}

	@Test
	void testPluginType() {
		PluginType.valueOf(PluginType.values()[PluginType.FEATURE.ordinal()].name());
	}
}
