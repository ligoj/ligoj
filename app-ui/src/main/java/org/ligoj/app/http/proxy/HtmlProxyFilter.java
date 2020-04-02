/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.proxy;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import lombok.Setter;

/**
 * Filter able to mask the HTML extension from the URL, and forward to the master HTML file as necessary.
 */
public class HtmlProxyFilter extends OncePerRequestFilter {

	/**
	 * HTML suffix.
	 */
	@Setter
	private String suffix = "";

	@Override
	protected void doFilterInternal(final HttpServletRequest request, final HttpServletResponse response, final FilterChain filterChain)
			throws ServletException, IOException {

		// Force encoding and IE compatibility
		response.setHeader("X-UA-Compatible", "IE=edge");

		// Disable cache for these main pages
		response.setHeader("Cache-Control", "no-cache");
		response.setHeader("Expires", "0");

		// Forward to the real resource : orientation and optimization according to the current environment
		final var baseName = getBaseName(request);
		request.getRequestDispatcher("/" + baseName + getOptimizedSuffix(baseName) + ".html").forward(request, response);
	}

	/**
	 * Return the base name of resource from the request.
	 */
	private String getBaseName(final ServletRequest request) {
		final var servletPath = ((HttpServletRequest) request).getServletPath();
		final var base = StringUtils.removeStart(servletPath, "/");
		return getBaseName(base.isEmpty() ? "index.html" : base);
	}

	/**
	 * Extract the base name from the Servlet path.
	 */
	private String getBaseName(final String servletPath) {
		return FilenameUtils.removeExtension(servletPath);
	}

	/**
	 * Return the optimized suffix corresponding to the given base name.
	 */
	private String getOptimizedSuffix(final String baseName) {
		if ("index".equals(baseName) || "login".equals(baseName)) {
			// Use environment code suffix
			return suffix;
		}
		// No suffix
		return "";
	}
}
