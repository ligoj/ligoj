/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

import com.samaxes.filter.CacheFilter;
import com.samaxes.filter.util.HTTPCacheHeader;

/**
 * Cache that does not enable cache for non 2xx codes.
 */
public class CacheBustingFilter extends CacheFilter {

	@Override
	public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) throws IOException, ServletException {
		final var httpResp = (HttpServletResponse) resp;
		super.doFilter(req, resp, chain);
		if (httpResp.getStatus() / 100 != 2) {
			httpResp.setHeader(HTTPCacheHeader.CACHE_CONTROL.getName(), "must-revalidate,no-cache,no-store");
			httpResp.setHeader(HTTPCacheHeader.PRAGMA.getName(), "no-cache");
			httpResp.setDateHeader(HTTPCacheHeader.EXPIRES.getName(), 0);
		}
	}
}