package org.ligoj.app.model;

import org.junit.Test;

import org.ligoj.bootstrap.model.AbstractBusinessEntityTest;
import org.ligoj.app.resource.session.User;

/**
 * Test business keyed entities basic ORM operations : hash code and equals.
 */
public class TestAbstractBusinessEntityTest extends AbstractBusinessEntityTest {

	/**
	 * Test equals and hash code operation with all possible combinations with only one identifier.
	 */
	@Test
	public void testEqualsAndHash() throws Exception {
		testEqualsAndHash(User.class, "name");
	}

}
