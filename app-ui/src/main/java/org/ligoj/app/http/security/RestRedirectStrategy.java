/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Setter;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.RedirectStrategy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;

/**
 * This strategy replace the standard 302 code by a simple JSON data since the client is a hidden Ajax thread. More information could be
 * added later in the JSON stream.
 */
@Setter
public class RestRedirectStrategy implements RedirectStrategy {

	private static final Map<String, String> EXTENSION_TO_MIME = Map.of("js", "text/javascript", "html", "text/html", "css", "text/css");

	/**
	 * Failure redirection mode. Default is true.
	 */
	private boolean success;

	/**
	 * When true, redirects must be followed for login/logout responses.
	 */
	@Setter
	private boolean forceRedirect;

	/**
	 * Status to use.
	 */
	private int status = HttpServletResponse.SC_OK;

	@Override
	public void sendRedirect(final HttpServletRequest request, final HttpServletResponse response, final String url) throws IOException {
		final var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (success && authentication instanceof CookieUsernamePasswordAuthenticationToken cAuth) {
			// Forward cookies from back-office
			cAuth.getCookies().forEach(cookie -> response.addHeader("Set-Cookie", cookie));
		}

		final var pathInfo = request.getPathInfo();
		final var extension = FilenameUtils.getExtension(pathInfo);
		final var mime = StringUtils.isEmpty(extension) ? null : EXTENSION_TO_MIME.get(extension);
		// Write the JSON data containing the redirection and the status
		final var redirect = forceRedirect ? response.encodeRedirectURL(request.getContextPath()) + Objects.requireNonNullElse(url, "") : "local";
		response.setStatus(mime == null ? status : HttpServletResponse.SC_OK);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType(mime == null ? "application/json" : mime);
		response.setHeader("x-redirect", redirect);
		response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
		response.setHeader("Pragma", "no-cache");
		response.setHeader("Expires", "0");
		if ("text/javascript".equals(mime)) {
			// `globalThis.errorManager` qualifies the lookup so an
			// undeclared identifier doesn't throw `ReferenceError` in
			// the new Vue host (no global `errorManager` exists there).
			// In the legacy UI the global is defined and the optional
			// call still runs; in the new UI this is a silent no-op
			// and the SPA's plugin loader handles the 401 itself.
			IOUtils.write(String.format("globalThis.errorManager?.handleRedirect('%s');", redirect), response.getOutputStream(), StandardCharsets.UTF_8);
		} else if ("text/html".equals(mime)) {
			IOUtils.write("<div></div>", response.getOutputStream(), StandardCharsets.UTF_8);
		} else if ("text/css".equals(mime)) {
			IOUtils.write("", response.getOutputStream(), StandardCharsets.UTF_8);
		} else {
			IOUtils.write(String.format("{\"success\":%b,\"redirect\":\"%s\"}", success, redirect), response.getOutputStream(), StandardCharsets.UTF_8);
		}
	}

}
