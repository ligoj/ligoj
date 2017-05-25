package org.ligoj.app.resource.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.core.Response;

import org.apache.commons.lang3.StringUtils;
import org.ligoj.bootstrap.core.SpringUtils;
import org.ligoj.bootstrap.core.resource.mapper.AccessDeniedExceptionMapper;
import org.ligoj.bootstrap.model.system.SystemAuthorization.AuthorizationType;
import org.ligoj.bootstrap.resource.system.security.AuthorizationResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.GenericFilterBean;

import lombok.Setter;

/**
 * URL based security filter based on RBAC strategy. Maintains a set of cache to determine as fast as possible the valid
 * authorizations from the incoming HTTP request.
 */
public class AuthorizingFilter extends GenericFilterBean {

	@Autowired
	private AuthorizationResource authorizationResource;

	/**
	 * Prefix to be removed and also ignored from the request.
	 */
	@Setter
	private String prefix;

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain) throws IOException, ServletException {
		final HttpServletRequest httpRequest = (HttpServletRequest) request;

		/**
		 * This is the most serious place of security check. If this filter is called, it means the previous security
		 * checks granted access until there. So, it mean the current user is either anonymous either (but assumed) an
		 * fully authenticated user. In case of anonymous user case, there is no role but ROLE_ANONYMOUS. So there is no
		 * need to involve more role checking. We assume there is no way to grant access to ROLE_ANONYMOUS with this
		 * filter.
		 */
		final Collection<? extends GrantedAuthority> authorities = SecurityContextHolder.getContext().getAuthentication().getAuthorities();
		if (!authorities.contains(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))) {
			// Not anonymous, so we need to check using RBAC strategy.

			// Build the URL
			final String fullRequest = getFullRequest(httpRequest);
			// Check access
			final HttpMethod method = HttpMethod.valueOf(StringUtils.upperCase(httpRequest.getMethod(), Locale.ENGLISH));
			if (!isAuthorized(authorities, fullRequest, method)) {
				// Forbidden access
				updateForbiddenAccess((HttpServletResponse) response);
				return;
			}
		}

		// Granted access, continue
		chain.doFilter(request, response);
	}

	/**
	 * Update response for a forbidden access.
	 */
	private void updateForbiddenAccess(final HttpServletResponse response) throws IOException {
		final Response response2 = SpringUtils.getBean(AccessDeniedExceptionMapper.class).toResponse(new AccessDeniedException(""));
		response.setStatus(response2.getStatus());
		response.setContentType(response2.getMediaType().toString());
		response.getOutputStream().write(((String) response2.getEntity()).getBytes(StandardCharsets.UTF_8));
	}

	/**
	 * Return the full request without query.
	 */
	private String getFullRequest(final HttpServletRequest httpRequest) {
		final String fullRequest = httpRequest.getRequestURI();
		return StringUtils.removeStart(fullRequest.substring(this.getServletContext().getContextPath().length() + prefix.length()), "/");
	}

	/**
	 * Check the authorization
	 */
	private boolean isAuthorized(final Collection<? extends GrantedAuthority> authorities, final String request, final HttpMethod method) {
		final Map<String, Map<HttpMethod, List<Pattern>>> authorizationsCache = authorizationResource.getAuthorizations().get(
				AuthorizationType.BUSINESS);

		// Check the authorization
		if (authorizationsCache != null) {
			for (final GrantedAuthority authority : authorities) {
				final Map<HttpMethod, List<Pattern>> authorizations = authorizationsCache.get(authority.getAuthority());
				if (authorizations != null && match(authorizations.get(method), request)) {
					// Granted access
					return true;
				}
			}
		}

		// No authorization found
		return false;
	}

	private boolean match(final Collection<Pattern> patterns, final String toMatch) {
		if (patterns != null) {
			for (final Pattern pattern : patterns) {
				if (pattern.matcher(toMatch).find()) {
					// Granted access
					return true;
				}
			}
		}
		return false;
	}
}
