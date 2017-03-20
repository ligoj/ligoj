package org.ligoj.app.http.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.CookieStore;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.config.Registry;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.HttpClientConnectionManager;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.conn.BasicHttpClientConnectionManager;
import org.apache.http.message.BasicHeader;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

/**
 * Gfi Intranet authentication provider.
 */
@Slf4j
public class GfiAuthenticationProvider implements AuthenticationProvider, InitializingBean {

	/**
	 * SSO post URL.
	 */
	@Setter
	@Getter
	private String ssoPostUrl;

	/**
	 * SSO post content format.
	 */
	@Setter
	@Getter
	private String ssoPostContent;

	/**
	 * SSO get format.
	 */
	@Setter
	private String ssoWelcome;

	/**
	 * SSO optional headers, have to be parsed.
	 */
	@Setter
	private String ssoHeaders = "";

	/**
	 * SSO headers ready to use with {@link HttpPost}.
	 */
	private Header[] ssoHeadersArray;

	/**
	 * Socket factory with https support.
	 */
	private Registry<ConnectionSocketFactory> socketFactoryRegistry;

	@Override
	public Authentication authenticate(final Authentication authentication) {
		final String userpassword = authentication.getCredentials().toString();
		final String userName = StringUtils.lowerCase(authentication.getPrincipal().toString());

		final HttpClientBuilder clientBuilder = HttpClientBuilder.create();

		// Initialize connection manager
		final HttpClientConnectionManager connectionManager = new BasicHttpClientConnectionManager(socketFactoryRegistry);
		clientBuilder.setConnectionManager(connectionManager);
		clientBuilder.setDefaultRequestConfig(RequestConfig.custom().setCookieSpec(CookieSpecs.DEFAULT).build());

		// Initialize cookie strategy
		final CookieStore cookieStore = new BasicCookieStore();
		final HttpClientContext context = HttpClientContext.create();
		context.setCookieStore(cookieStore);
		clientBuilder.setDefaultCookieStore(cookieStore);

		// First get the cookie
		final CloseableHttpClient httpClient = clientBuilder.build();

		// Do the POST
		try {
			final HttpGet httpGet = new HttpGet(ssoWelcome);
			org.apache.http.util.EntityUtils.consumeQuietly(httpClient.execute(httpGet).getEntity());
			final HttpPost httpPost = new HttpPost(ssoPostUrl);
			final String content = String.format(ssoPostContent, userName, userpassword);
			log.info(userName + ":" + StringUtils.repeat('*', userpassword.length()));
			httpPost.setEntity(new StringEntity(content, StandardCharsets.UTF_8));
			httpPost.setHeaders(ssoHeadersArray);
			final HttpResponse httpResponse = httpClient.execute(httpPost);
			if (HttpStatus.SC_OK == httpResponse.getStatusLine().getStatusCode()
					&& org.apache.http.util.EntityUtils.toString(httpResponse.getEntity(), StandardCharsets.UTF_8).startsWith("//OK")) {
				return new UsernamePasswordAuthenticationToken(userName, authentication.getCredentials(), authentication.getAuthorities());
			}
			httpResponse.getEntity().getContent().close();
		} catch (final IOException e) {
			log.warn("Remote SSO server is not available", e);
		} finally {
			IOUtils.closeQuietly(httpClient);
		}
		throw new BadCredentialsException("Invalid user or password");
	}

	/**
	 * Authentication supports.
	 * {@inheritDoc}
	 * 
	 * @return Always <code>true</code>
	 */
	@Override
	public boolean supports(final Class<?> authentication) {
		return true;
	}

	/**
	 * Dummy SSL manager.
	 */
	public static class X509TrustManager implements javax.net.ssl.X509TrustManager {
		@Override
		public X509Certificate[] getAcceptedIssuers() {
			return new X509Certificate[0];
		}

		@Override
		public void checkClientTrusted(final X509Certificate[] certs, final String authType) {
			// Ignore this, it's OK
		}

		@Override
		public void checkServerTrusted(final X509Certificate[] certs, final String authType) {
			// Yes we trust
		}
	}

	@Override
	public void afterPropertiesSet() throws GeneralSecurityException {

		// Initialize HTTPS scheme
		final TrustManager[] allCerts = new TrustManager[] { new X509TrustManager() };
		final SSLContext sslContext = SSLContext.getInstance("SSL");
		sslContext.init(null, allCerts, new SecureRandom());
		final SSLConnectionSocketFactory sslSocketFactory = new SSLConnectionSocketFactory(sslContext, NoopHostnameVerifier.INSTANCE);
		socketFactoryRegistry = RegistryBuilder.<ConnectionSocketFactory>create().register("https", sslSocketFactory)
				.register("http", PlainConnectionSocketFactory.getSocketFactory()).build();

		// Initialize headers
		final String[] headers = StringUtils.split(this.ssoHeaders, '$');
		this.ssoHeadersArray = new Header[headers.length];
		for (int index = 0; index < headers.length; index++) {
			final String[] data = StringUtils.split(headers[index], '|');
			this.ssoHeadersArray[index] = new BasicHeader(data[0], data[1]);
		}
	}
}