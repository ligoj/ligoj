/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import org.springframework.security.access.expression.SecurityExpressionOperations;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.FilterInvocation;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/**
 * Custom expression handler using a different expression manager.
 */
public class ExtendedSecurityExpressionHandler extends AbstractCommonSecurityExpressionHandler<FilterInvocation> {

	@Override
	protected SecurityExpressionOperations createSecurityExpressionRoot(final Authentication authentication, final FilterInvocation fi) {
		return complete( new ExtendedWebSecurityExpressionRoot(() -> authentication, new RequestAuthorizationContext(fi.getRequest())));
	}

}
