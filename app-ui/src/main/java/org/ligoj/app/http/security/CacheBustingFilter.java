/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import lombok.AllArgsConstructor;
import org.apache.hc.core5.http.HttpHeaders;

import java.io.IOException;

/**
 * Cache that does not enable cache for non 2xx codes.
 */
@AllArgsConstructor
public class CacheBustingFilter implements Filter {

	private final long expiration;

	/**
	 * When <code>true</code>, the long {@link #expiration} applies only to requests carrying a <code>v</code> version
	 * parameter (versioned URLs whose token rotates with the content, e.g. the plugin digest). Unversioned requests
	 * are then served with <code>no-cache</code> so the browser revalidates them on each use.
	 */
	private final boolean versionedOnly;

	/**
	 * Unconditional expiration filter.
	 *
	 * @param expiration The cache duration in seconds applied to all 2xx responses.
	 */
	public CacheBustingFilter(final long expiration) {
		this(expiration, false);
	}

	@Override
	public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) throws IOException, ServletException {
		final var httpResp = (HttpServletResponse) resp;
		if (httpResp.getStatus() / 100 != 2) {
			httpResp.setHeader(HttpHeaders.CACHE_CONTROL, "must-revalidate,no-cache,no-store");
			httpResp.setHeader(HttpHeaders.PRAGMA, "no-cache");
			httpResp.setDateHeader(HttpHeaders.EXPIRES, 0);
		} else if (expiration <= 0 || (versionedOnly && req.getParameter("v") == null)) {
			// Cacheable but always revalidated: for mutable resources living at
			// stable URLs (e.g. runtime plugin bundles), the browser must check
			// freshness on each use instead of trusting a long max-age.
			httpResp.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");
			httpResp.setDateHeader(HttpHeaders.EXPIRES, 0);
		} else if (versionedOnly) {
			// Versioned URL: the content at this exact URL never changes (the
			// version token rotates instead) — cache it as immutable.
			httpResp.setHeader(HttpHeaders.CACHE_CONTROL, "public, max-age=" + expiration + ", immutable");
			httpResp.setDateHeader(HttpHeaders.EXPIRES, System.currentTimeMillis() + expiration * 1000L);
		} else {
			// Set cache directives
			httpResp.setHeader(HttpHeaders.CACHE_CONTROL, "public, max-age=" + expiration);
			httpResp.setDateHeader(HttpHeaders.EXPIRES, System.currentTimeMillis() + expiration * 1000L);
		}
		/*
		 * By default, some servers (e.g. Tomcat) will set headers on any SSL content to deny caching. Omitting the
		 * Pragma header takes care of user-agents implementing HTTP/1.0.
		 */
		chain.doFilter(req, new IgnorePragmaResponseWrapper(httpResp));
	}

	static class IgnorePragmaResponseWrapper extends HttpServletResponseWrapper {
		public IgnorePragmaResponseWrapper(HttpServletResponse httpResp) {
			super(httpResp);
		}

		@Override
		public void addHeader(String name, String value) {
			if (!HttpHeaders.PRAGMA.equalsIgnoreCase(name)) {
				super.addHeader(name, value);
			}
		}

		@Override
		public void setHeader(String name, String value) {
			if (!HttpHeaders.PRAGMA.equalsIgnoreCase(name)) {
				super.setHeader(name, value);
			}
		}
	}
}