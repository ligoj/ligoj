/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;

/**
 * Matches when the current request contains a specific parameter.
 */
@AllArgsConstructor
public class HasParameterRequestMatcher implements org.springframework.security.web.util.matcher.RequestMatcher {

	private final String parameter;

	@Override
	public boolean matches(final HttpServletRequest request) {
		return StringUtils.isNotBlank(request.getParameter(parameter));
	}

}
