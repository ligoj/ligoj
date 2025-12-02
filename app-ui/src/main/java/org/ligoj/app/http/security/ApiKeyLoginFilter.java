/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.bootstrap.http.security.CookieUsernamePasswordAuthenticationToken;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication filter for API key-based login that creates a session. This filter intercepts requests to /login-by-api-key and
 * authenticates users using api-key and api-user parameters (or headers).
 */
@Slf4j
public class ApiKeyLoginFilter extends AbstractAuthenticationProcessingFilter {

	@Setter
	private RestTemplate restTemplate = new RestTemplate();

	private final boolean enableLoginByApiKey;

	/**
	 * Constructor defining the filtering path.
	 *
	 * @param filterProcessesUrl The login URL.
	 */
	public ApiKeyLoginFilter(final String filterProcessesUrl, final boolean enableLoginByApiKey) {
		super(filterProcessesUrl);
		setAuthenticationManager(authentication -> authentication);
		this.enableLoginByApiKey = enableLoginByApiKey;
	}

	/**
	 * Extract api-key from request parameters or headers.
	 *
	 * @param request The HTTP request
	 * @return The API key value or null if not found
	 */
	private String getApiKey(HttpServletRequest request) {
		final var apiKey = request.getParameter("api-key");
		if (StringUtils.isNotBlank(apiKey)) {
			return apiKey;
		}
		return request.getHeader("x-api-key");
	}

	/**
	 * Extract api-user from request parameters or headers.
	 *
	 * @param request The HTTP request
	 * @return The API user value or null if not found
	 */
	private String getApiUser(HttpServletRequest request) {
		final var apiUser = request.getParameter("api-user");
		if (StringUtils.isNotBlank(apiUser)) {
			return apiUser;
		}
		return request.getHeader("x-api-user");
	}

	@Override
	public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
		if (!enableLoginByApiKey) {
			// Feature is disabled
			return null;
		}

		final var apiKey = getApiKey(request);
		final var apiUser = getApiUser(request);

		if (StringUtils.isBlank(apiKey) || StringUtils.isBlank(apiUser)) {
			log.warn("Missing api-key or api-user in request to /login-by-api-key");
			return null;
		}

		log.info("Attempting API key authentication for user: {}", apiUser);

		// Call /rest/session to validate credentials (don't reuse its session)
		try {
			// Build the full URL (localhost for internal call)
			final var sessionUrl = String.format("http://localhost:%d%s/rest/session", request.getServerPort(), request.getContextPath());

			// Set headers
			final var headers = new HttpHeaders();
			headers.set("x-api-key", apiKey);
			headers.set("x-api-user", apiUser);

			final var entity = new HttpEntity<Void>(headers);

			// Make the request to validate credentials
			final var sessionResponse = restTemplate.exchange(sessionUrl, HttpMethod.GET, entity, String.class);

			log.info("Validation endpoint returned status: {}", sessionResponse.getStatusCode());

			// Check if credentials are valid (200 = authenticated)
			if (sessionResponse.getStatusCode().is2xxSuccessful()) {
				// Convert JSON to map
				final var map = new ObjectMapper().readValue(sessionResponse.getBody(), Map.class);

				// Credentials are valid - get real username if provided
				final var isAdmin = ((Collection<?>) map.get("apiAuthorizations")).stream().map(m -> (Map<?, ?>) m).anyMatch(m -> "DELETE".equals(m.get("method")) && ".*".equals(m.get("pattern")));
				if (!isAdmin) {
					log.info("API key validation successful for user: {}, but is not an administrator", apiUser);
					return null;
				}
				final var realUserName = Optional.ofNullable(map.get("userName")).orElse(apiUser);

				log.info("API key validation successful for administrator user: {}[{}]", apiUser, realUserName);

				// Create authentication - Spring Security will create its own session
				return new CookieUsernamePasswordAuthenticationToken(realUserName, apiKey, List.of(new SimpleGrantedAuthority("ROLE_USER")), List.of());
			}
			return null;
		} catch (Exception e) {
			log.error("Error validating credentials via /rest/session", e);
			return null;
		}
	}
}
