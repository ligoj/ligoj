/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.ligoj.bootstrap.http.security.CookieUsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

import lombok.extern.slf4j.Slf4j;

/**
 * REST authenticated provider.
 */
@Slf4j
public class RestAuthenticationProvider extends AbstractAuthenticationProvider {

	@Override
	public Authentication authenticate(final Authentication authentication) {
		final String userpassword = StringUtils.defaultString(authentication.getCredentials().toString(), "");
		final String userName = StringUtils.lowerCase(authentication.getPrincipal().toString());

		// First get the cookie
		final HttpClientBuilder clientBuilder = HttpClientBuilder.create();
		clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.STANDARD).build());
		final CloseableHttpClient httpClient = clientBuilder.build();
		final HttpPost httpPost = new HttpPost(getSsoPostUrl());

		// Do the POST
		try {
			final String content = String.format(getSsoPostContent(), userName, userpassword);
			httpPost.setEntity(new StringEntity(content, StandardCharsets.UTF_8));
			httpPost.setHeader("Content-Type", "application/json");
			final HttpResponse httpResponse = httpClient.execute(httpPost);
			if (HttpStatus.SC_NO_CONTENT == httpResponse.getStatusLine().getStatusCode()) {
				// Succeed authentication, save the cookies data inside the authentication
				return newAuthentication(userName, userpassword, authentication, httpResponse);
			}
			log.info("Failed authentication of {}[{}] : {}", userName, userpassword.length(), httpResponse.getStatusLine().getStatusCode());
			httpResponse.getEntity().getContent().close();
		} catch (final IOException e) {
			log.warn("Remote SSO server is not available", e);
		} finally {
			IOUtils.closeQuietly(httpClient);
		}
		throw new BadCredentialsException("Invalid user or password");
	}

	/**
	 * Return a new authentication with the the real use name.
	 */
	private Authentication newAuthentication(final String userName, final String userpassword, final Authentication authentication,
			final HttpResponse httpResponse) {
		final List<String> cookies = Arrays.stream(httpResponse.getAllHeaders()).filter(header -> "set-cookie".equals(header.getName()))
				.map(Header::getValue).collect(Collectors.toList());

		// Get the optional real user name if provided
		final String realUserName = Optional.ofNullable(httpResponse.getFirstHeader("X-Real-User")).map(Header::getValue).orElse(userName);
		if (realUserName.equals(userName)) {
			log.info("Success authentication of {}[{}]", realUserName, userpassword.length(), realUserName);
		} else {
			log.info("Success authentication of {}[{}] using login {}", realUserName, userpassword.length(), userName);
		}

		// Return the authentication token
		return new CookieUsernamePasswordAuthenticationToken(realUserName, authentication.getCredentials(), authentication.getAuthorities(), cookies);

	}
}