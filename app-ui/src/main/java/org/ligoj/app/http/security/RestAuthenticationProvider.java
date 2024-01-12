/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import lombok.Generated;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.ligoj.bootstrap.http.security.CookieUsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.Objects;
import java.util.Optional;

/**
 * REST authenticated provider.
 */
@Slf4j
public class RestAuthenticationProvider extends AbstractAuthenticationProvider {

	@Override
	public Authentication authenticate(final Authentication authentication) {
		return authenticate(StringUtils.lowerCase(authentication.getPrincipal().toString()),
				Objects.toString(authentication.getCredentials().toString(), ""), authentication.getAuthorities());
	}

	/**
	 * Return a new {@link HttpClientBuilder} instance.
	 *
	 * @return A new {@link HttpClientBuilder} instance.
	 */
	private HttpClientBuilder newClientBuilder() {
		final var clientBuilder = HttpClientBuilder.create();
		// First get the cookie
		clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.STANDARD).build());
		return clientBuilder;
	}

	@Generated
	protected Authentication authenticate(final String username, final String credential, final Collection<? extends GrantedAuthority> authorities) {
		try (var httpClient = newClientBuilder().build()) {
			// Do the POST
			final var authentication = doLogin(httpClient, username, credential, authorities);
			if (authentication != null) {
				return authentication;
			}
		} catch (final IOException e) {
			log.warn("Remote SSO server is not available", e);
		}
		throw new BadCredentialsException("Invalid user or password");
	}

	/**
	 * Return a new authentication with the real use name.
	 */
	private Authentication newAuthentication(final String username, final String credentials,
			final Collection<? extends GrantedAuthority> authorities, final HttpResponse httpResponse) {
		final var cookies = Arrays.stream(httpResponse.getAllHeaders()).filter(header -> "set-cookie".equals(header.getName())).map(Header::getValue)
				.toList();

		// Get the optional real username if provided
		final var realUserName = Optional.ofNullable(httpResponse.getFirstHeader("X-Real-User")).map(Header::getValue).orElse(username);
		if (realUserName.equals(username)) {
			log.info("Success authentication of {}[{}]", realUserName, credentials.length());
		} else {
			log.info("Success authentication of {}[{}] using login {}", realUserName, credentials.length(), username);
		}

		// Return the authentication token
		return new CookieUsernamePasswordAuthenticationToken(realUserName, credentials, authorities, cookies);

	}

	/**
	 * Perform the login
	 *
	 * @param httpClient The client
	 * @param username   the basic username.
	 * @param credential the basic password.
	 * @return The {@link CloseableHttpResponse} response.
	 * @throws IOException When execution failed
	 */
	protected Authentication doLogin(final CloseableHttpClient httpClient, final String username, final String credential,
			final Collection<? extends GrantedAuthority> authorities) throws IOException {
		final var httpPost = new HttpPost(getSsoPostUrl());
		final var content = String.format(getSsoPostContent(), username, credential.replace("\\", "\\\\").replace("\"", "\\\""));
		httpPost.setEntity(new StringEntity(content, StandardCharsets.UTF_8));
		httpPost.setHeader("Content-Type", "application/json");
		final var apiResponse = httpClient.execute(httpPost);
		final var statusCode = apiResponse.getStatusLine().getStatusCode();

		if (HttpStatus.SC_NO_CONTENT == statusCode) {
			// Succeed authentication, save the cookies data inside the authentication
			return newAuthentication(username, credential, authorities, apiResponse);
		}
		log.info("Failed authentication of {}[{}] : {}", username, credential.length(), statusCode);
		apiResponse.getEntity().getContent().close();
		return null;
	}
}