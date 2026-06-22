/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.IOException;

/**
 * Servlet filter that decodes percent-encoded colons ({@code %3A} /
 * {@code %3a}) in the request URI before the request reaches CXF.
 *
 * CXF matches JAX-RS {@code @Path} regexes against the raw (still
 * percent-encoded) URI, so a template such as
 * {@code @Path("{node:service:.+}/parameter/{mode}")} fails to match when the
 * client encoded the colons with {@code encodeURIComponent} and sent
 * {@code service%3Aid%3Aldap}. The colon ({@code ":"}) is a sub-delim that
 * RFC 3986 explicitly allows unencoded inside a path segment, so substituting
 * {@code %3A} → {@code :} is safe; we deliberately leave every other
 * percent-encoding (notably {@code %2F}) alone to avoid altering the path
 * structure or query string.
 */
public class UriColonDecodingFilter implements Filter {

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain)
			throws IOException, ServletException {
		if (request instanceof HttpServletRequest http) {
			chain.doFilter(new ColonDecodedRequest(http), response);
		} else {
			chain.doFilter(request, response);
		}
	}

	private static final class ColonDecodedRequest extends HttpServletRequestWrapper {

		ColonDecodedRequest(final HttpServletRequest request) {
			super(request);
		}

		@Override
		public String getRequestURI() {
			return decode(super.getRequestURI());
		}

		@Override
		public StringBuffer getRequestURL() {
			final var url = super.getRequestURL();
			final var decoded = decode(url.toString());
			url.setLength(0);
			url.append(decoded);
			return url;
		}

		@Override
		public String getServletPath() {
			return decode(super.getServletPath());
		}

		@Override
		public String getPathInfo() {
			return decode(super.getPathInfo());
		}

		private static String decode(final String value) {
			if (value == null || value.indexOf('%') < 0) {
				return value;
			}
			return value.replace("%3A", ":").replace("%3a", ":");
		}
	}
}
