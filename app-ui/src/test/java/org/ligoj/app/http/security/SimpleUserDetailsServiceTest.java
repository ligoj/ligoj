package org.ligoj.app.http.security;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * User details service test.
 */
public class SimpleUserDetailsServiceTest {

	@Test
	public void testLoadByUserName() {
		final UserDetails userDetails = new SimpleUserDetailsService().loadUserByUsername("JUNIT");
		Assertions.assertEquals("JUNIT", userDetails.getUsername());
	}
}
