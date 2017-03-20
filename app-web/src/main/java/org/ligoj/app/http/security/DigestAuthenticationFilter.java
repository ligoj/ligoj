package org.ligoj.app.http.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpResponse;
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

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

/**
 * Listen "/oauth/token?target=anypath", extract token, and send it to business to validate it.
 */
@Slf4j
public class DigestAuthenticationFilter extends AbstractAuthenticationProcessingFilter {

	/**
	 * Constructor defining the filtering path.
	 */
	public DigestAuthenticationFilter() {
		super("/oauth");
		setAuthenticationManager(authentication -> authentication);
	}

	/**
	 * SSO post URL.
	 */
	@Setter
	@Getter
	private String ssoPostUrl;

	@Override
	public Authentication attemptAuthentication(final HttpServletRequest request, final HttpServletResponse response) {
		final String token = request.getParameter("token");

		if (token != null) {
			// Token is the last part of URL

			// First get the cookie
			final HttpClientBuilder clientBuilder = HttpClientBuilder.create();
			clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.IGNORE_COOKIES).build());
			final CloseableHttpClient httpClient = clientBuilder.build();

			// Do the POST
			try {
				final HttpPost httpPost = new HttpPost(getSsoPostUrl());
				httpPost.setEntity(new StringEntity(token, StandardCharsets.UTF_8.name()));
				httpPost.setHeader("Content-Type", "application/json");
				final HttpResponse httpResponse = httpClient.execute(httpPost);
				if (HttpStatus.SC_OK == httpResponse.getStatusLine().getStatusCode()) {
					return getAuthenticationManager().authenticate(
							new UsernamePasswordAuthenticationToken(EntityUtils.toString(httpResponse.getEntity()), "N/A",
									new ArrayList<>()));
				}
			} catch (final IOException e) {
				log.warn("Local SSO server is not available", e);
			} finally {
				IOUtils.closeQuietly(httpClient);
			}

		}
		throw new BadCredentialsException("Invalid user or password");
	}

}
