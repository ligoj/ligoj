/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.FilterInvocation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test class of {@link ExtendedSecurityExpressionHandler}
 */
class ExtendedSecurityExpressionHandlerTest {

	@Test
    void testHasHeader() {
        var invocation = mock(FilterInvocation.class);
        var request = mock(HttpServletRequest.class);
		when(request.getHeader("header")).thenReturn("value");
		when(invocation.getRequest()).thenReturn(request);
		Assertions.assertTrue(((ExtendedWebSecurityExpressionRoot) new ExtendedSecurityExpressionHandler().createSecurityExpressionRoot(
				mock(Authentication.class), invocation)).hasHeader("header"));
	}

	@Test
    void testHasParameter() {
        var invocation = mock(FilterInvocation.class);
        var request = mock(HttpServletRequest.class);
		when(request.getParameter("parameter")).thenReturn("value");
		when(invocation.getRequest()).thenReturn(request);
		Assertions.assertTrue(((ExtendedWebSecurityExpressionRoot) new ExtendedSecurityExpressionHandler().createSecurityExpressionRoot(
				mock(Authentication.class), invocation)).hasParameter("parameter"));
	}
}
