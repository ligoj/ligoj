package org.ligoj.app.http.security;

import org.junit.Assert;
import org.junit.Test;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * User details service test.
 */
public class SimpleUserDetailsServiceTest {

	@Test
	public void testLoadByUserName() {
		final UserDetails userDetails = new SimpleUserDetailsService().loadUserByUsername("JUNIT");
		Assert.assertEquals("JUNIT", userDetails.getUsername());
	}
}
