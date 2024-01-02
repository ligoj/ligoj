/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

/**
 * Listen "/oauth/token?target=path", extract token, and send it to business to validate it.
 */
@Slf4j
@Setter
@Getter
public class DigestAuthenticationFilter extends AbstractAuthenticationProcessingFilter {

	/**
	 * SSO post URL.
	 */
	private String ssoPostUrl;

	/**
	 * Constructor defining the filtering path.
	 */
	public DigestAuthenticationFilter() {
		super("/oauth");
		setAuthenticationManager(authentication -> authentication);
	}


	/**
	 * Return a new {@link HttpClientBuilder} instance.
	 *
	 * @return A new {@link HttpClientBuilder} instance.
	 */
	private HttpClientBuilder newClientBuilder() {
		final var clientBuilder = HttpClientBuilder.create();
		clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.IGNORE_COOKIES).build());
		return clientBuilder;
	}

	@Override
	public Authentication attemptAuthentication(final HttpServletRequest request, final HttpServletResponse response) {
		final var token = request.getParameter("token");
		if (token == null) {
			throw new BadCredentialsException("Missing user or password");
		}
		return doLogin(token);
	}

	/**
	 * Perform the login
	 *
	 * @param token the SSO token
	 * @return The {@link Authentication} result.
	 */
	@Generated
	protected Authentication doLogin(final String token) {
		try (var httpClient = newClientBuilder().build()) {
			final var apiResponse = doLogin(httpClient, token);
			if (apiResponse != null) {
				return apiResponse;
			}
		} catch (final IOException e) {
			log.warn("Local SSO server is not available", e);
		}
		throw new BadCredentialsException("Invalid user or password");
	}

	/**
	 * Perform the login
	 *
	 * @param httpClient The client
	 * @param token      the SSO token
	 * @return The API content when acceptable.
	 * @throws IOException When execution failed
	 */
	protected Authentication doLogin(final CloseableHttpClient httpClient, final String token) throws IOException {
		final var httpPost = new HttpPost(getSsoPostUrl());
		httpPost.setEntity(new StringEntity(token, StandardCharsets.UTF_8));
		httpPost.setHeader("Content-Type", "application/json");
		final var response = httpClient.execute(httpPost);
		if (HttpStatus.SC_OK == response.getStatusLine().getStatusCode()) {
			final var apiResponse = EntityUtils.toString(response.getEntity());
			return getAuthenticationManager().authenticate(new UsernamePasswordAuthenticationToken(apiResponse, "N/A", new ArrayList<>()));
		}
		return null;
	}
}
