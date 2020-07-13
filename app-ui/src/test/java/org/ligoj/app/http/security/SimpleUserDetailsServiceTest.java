/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * User details service test.
 */
class SimpleUserDetailsServiceTest {

	@Test
	void testLoadByUserName() {
		final UserDetails userDetails = new SimpleUserDetailsService().loadUserByUsername("JUNIT");
		Assertions.assertEquals("JUNIT", userDetails.getUsername());
	}
}
