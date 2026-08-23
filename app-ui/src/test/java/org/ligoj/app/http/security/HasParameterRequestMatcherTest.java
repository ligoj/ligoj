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
 * Test class of {@link HasParameterRequestMatcher}
 */
class HasParameterRequestMatcherTest {

	@Test
    void testMatches() {
        var request = mock(HttpServletRequest.class);
		when(request.getParameter("parameter")).thenReturn("value");
		Assertions.assertTrue(new HasParameterRequestMatcher("parameter").matches(request));
	}

	@Test
    void testBlank() {
        var request = mock(HttpServletRequest.class);
		when(request.getParameter("parameter")).thenReturn(" ");
		Assertions.assertFalse(new HasParameterRequestMatcher("parameter").matches(request));
	}
}
