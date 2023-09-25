/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.http.HttpStatus;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

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

	@Override
	public Authentication attemptAuthentication(final HttpServletRequest request, final HttpServletResponse response) {
		final var token = request.getParameter("token");

		if (token != null) {
			// Token is the last part of URL
			// First get the cookie
			final var clientBuilder = HttpClientBuilder.create();
			clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.IGNORE_COOKIES).build());
			// Do the POST
			try (var httpClient = clientBuilder.build()) {
				final var httpResponse = doLogin(httpClient, token);
				if (HttpStatus.SC_OK == httpResponse.getStatusLine().getStatusCode()) {
					return getAuthenticationManager().authenticate(new UsernamePasswordAuthenticationToken(EntityUtils.toString(httpResponse.getEntity()), "N/A", new ArrayList<>()));
				}
			} catch (final IOException e) {
				log.warn("Local SSO server is not available", e);
			}

		}
		throw new BadCredentialsException("Invalid user or password");
	}

	/**
	 * Perform the login
	 *
	 * @param httpClient The client
	 * @param token      the SSO token
	 * @return The {@link CloseableHttpResponse} response.
	 * @throws IOException When execution failed
	 */
	protected CloseableHttpResponse doLogin(final CloseableHttpClient httpClient, final String token) throws IOException {
		final var httpPost = new HttpPost(getSsoPostUrl());
		httpPost.setEntity(new StringEntity(token, StandardCharsets.UTF_8));
		httpPost.setHeader("Content-Type", "application/json");
		return httpClient.execute(httpPost);
	}
}
