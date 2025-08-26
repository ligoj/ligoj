/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.proxy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.Strings;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter able to mask the HTML extension from the URL, and forward to the master HTML file as necessary.
 */
@Slf4j
@Setter
public class HtmlProxyFilter extends OncePerRequestFilter {

	/**
	 * HTML suffix.
	 */
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
		final var optimizedUrl = "/" + baseName + getOptimizedSuffix(baseName) + ".html";
		log.debug("Forward to {}", optimizedUrl);
		request.getRequestDispatcher(optimizedUrl).forward(request, response);
	}

	/**
	 * Return the base name of resource from the request.
	 */
	private String getBaseName(final ServletRequest request) {
		final var servletPath = ((HttpServletRequest) request).getServletPath();
		final var base = Strings.CS.removeStart(servletPath, "/");
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
