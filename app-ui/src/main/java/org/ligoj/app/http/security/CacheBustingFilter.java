/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;

import java.io.IOException;

/**
 * Cache that does not enable cache for non 2xx codes.
 */
public class CacheBustingFilter implements Filter {

	private final long expiration;

	public CacheBustingFilter(final long expiration) {
		this.expiration = expiration;
	}

	@Override
	public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) throws IOException, ServletException {
		final var httpResp = (HttpServletResponse) resp;
		if (httpResp.getStatus() / 100 != 2) {
			httpResp.setHeader("Cache-Control", "must-revalidate,no-cache,no-store");
			httpResp.setHeader("Pragma", "no-cache");
			httpResp.setDateHeader("Expires", 0);
		} else {
			// Set cache directives
			httpResp.setHeader("Cache-Control", "public, max-age=" + expiration);
			httpResp.setDateHeader("Expires", System.currentTimeMillis() + expiration * 1000L);
		}
		/*
		 * By default, some servers (e.g. Tomcat) will set headers on any SSL content to deny caching. Omitting the
		 * Pragma header takes care of user-agents implementing HTTP/1.0.
		 */
		chain.doFilter(req, new HttpServletResponseWrapper(httpResp) {
			@Override
			public void addHeader(String name, String value) {
				if (!"Pragma".equalsIgnoreCase(name)) {
					super.addHeader(name, value);
				}
			}

			@Override
			public void setHeader(String name, String value) {
				if (!"Pragma".equalsIgnoreCase(name)) {
					super.setHeader(name, value);
				}
			}
		});
	}
}