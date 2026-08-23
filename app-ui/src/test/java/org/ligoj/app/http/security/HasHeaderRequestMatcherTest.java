/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test class of {@link HasHeaderRequestMatcher}
 */
class HasHeaderRequestMatcherTest {

	@Test
    void testMatches() {
        var request = mock(HttpServletRequest.class);
		when(request.getHeader("header")).thenReturn("value");
		Assertions.assertTrue(new HasHeaderRequestMatcher("header").matches(request));
	}

	@Test
    void testBlank() {
        var request = mock(HttpServletRequest.class);
		when(request.getHeader("header")).thenReturn(" ");
		Assertions.assertFalse(new HasHeaderRequestMatcher("header").matches(request));
	}
}
