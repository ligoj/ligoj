/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import jakarta.activation.FileTypeMap;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

/**
 * <p>
 * This servlet enables Servlet 2.x compliant containers to serve up Webjars resources
 * </p>
 * <p>
 * Copied from org.webjars:webjars-servlet-2.x:1.5, because we need to retrieve webjars resources from Thread
 * Classloader and not only in web-inf/lib. We also removed cache management.
 * </p>
 */
@Slf4j
public class WebjarsServlet extends HttpServlet {

	/**
	 * serial version uid
	 */
	private static final long serialVersionUID = 2461047578940577569L;

	/**
	 * Classpath root under which all served resources must resolve. Any request escaping this root
	 * (path traversal) is rejected.
	 */
	private static final Path RESOURCES_ROOT = Paths.get("META-INF/resources");

	/**
	 * Additional mime types
	 */
	private final transient Map<String, String> mimeTypes = new HashMap<>();

	/**
	 * Constructor registering additional MIME types.
	 */
	public WebjarsServlet() {
		// Register additional MIME types
		mimeTypes.put("woff", "application/font-woff");
		mimeTypes.put("woff2", "font/woff2");
		mimeTypes.put("ttf", "application/x-font-truetype");
		mimeTypes.put("eot", "application/vnd.ms-fontobject");
		mimeTypes.put("svg", "image/svg+xml");
		mimeTypes.put("otf", "application/x-font-opentype");
	}

	protected boolean hasMorePriority(URL url) {
		return url.toString().startsWith("file:");
	}

	/**
	 * Return resources matching to requested URI.
	 *
	 * @param webjarsResourceURI Requested resource's URI.
	 * @return enumerated matches.
	 */
	protected Enumeration<URL> getResources(String webjarsResourceURI) throws IOException {
		return Thread.currentThread().getContextClassLoader().getResources(webjarsResourceURI);
	}

	@Override
	protected void doGet(final HttpServletRequest request, final HttpServletResponse response) {
		try {
			serveResource(request, response);
		} catch (final IOException ioe) {
			// S1989: an exception must never reach the container (it would expose the
			// container's error page/stack). Typical cause: client aborted the
			// download (broken pipe) or `sendError` failed on a broken connection.
			log.warn("Unable to serve webjars resource {}: {}", request.getRequestURI(), ioe.getMessage());
			if (!response.isCommitted()) {
				response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			}
		}
	}

	/**
	 * Resolve and serve the requested webjars resource. Split from {@link #doGet} so the single
	 * IO-failure handler up there covers every {@link IOException} source (sendError, resource
	 * lookup, stream copy) without per-call try/catch noise.
	 *
	 * @param request  The resource request.
	 * @param response The response to fill.
	 * @throws IOException When the resource cannot be read or the response cannot be written.
	 */
	private void serveResource(final HttpServletRequest request, final HttpServletResponse response)
			throws IOException {
		final var requestedResourceURI = "META-INF/resources"
				+ request.getRequestURI().replaceFirst(request.getContextPath(), "");
		log.debug("Webjars requested resource: {}", requestedResourceURI);

		if (isDirectoryRequest(requestedResourceURI)) {
			// Directory listing is forbidden, but act as a 404 for security purpose.
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		// Canonicalize the requested URI and reject any path traversal escaping the resources root.
		// From here, only this sanitized value is used to reach the resource lookup (S2083).
		final var resourcePath = Paths.get(requestedResourceURI).normalize();
		if (!resourcePath.startsWith(RESOURCES_ROOT)) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}
		final var webjarsResourceURI = resourcePath.toString().replace('\\', '/');

		// Regular file, use the last resource instead of the first found
		Enumeration<URL> resources;
		try {
			resources = getResources(webjarsResourceURI);
		} catch (IOException _) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		URL webjarsResourceURL = null;
		if (resources.hasMoreElements()) {
			webjarsResourceURL = resources.nextElement();
		}
		if (resources.hasMoreElements()) {
			var webjarsResourceFileUrl = resources.nextElement();
			if (hasMorePriority(webjarsResourceFileUrl)) {
				// Highest priority for local files
				webjarsResourceURL = webjarsResourceFileUrl;
			}
		}

		if (webjarsResourceURL == null) {
			// File not found --> 404
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		} else {
			serveFile(response, webjarsResourceURI, webjarsResourceURL.openStream());
		}
	}

	/**
	 * Copy the file stream to the response using the right mime type.
	 *
	 * @param response           Target response.
	 * @param webjarsResourceURI Source URI used to determine the MIME type.
	 * @param inputStream        The source input stream.
	 * @throws IOException When related resource cannot be read.
	 */
	protected void serveFile(final HttpServletResponse response, final String webjarsResourceURI,
			final InputStream inputStream) throws IOException {
		try (inputStream) {
			final var filename = getFileName(webjarsResourceURI);
			response.setContentType(guessMimeType(filename));
			inputStream.transferTo(response.getOutputStream());
			response.flushBuffer();
		}
	}

	/**
	 * Guess the MIME type from the file name.
	 *
	 * @param filename The requested file name.
	 * @return The resolved MIME type. May be <code>null</code>.
	 */
	protected String guessMimeType(final String filename) {
		// First, get the mime type provided by the Servlet container
		var mimeType = this.getServletContext().getMimeType(filename);
		if (mimeType == null) {
			// Use the static extension based extension
			mimeType = mimeTypes.get(FilenameUtils.getExtension(filename));
		}
		if (mimeType == null) {
			// Use the mime type guess by JSE
			mimeType = FileTypeMap.getDefaultFileTypeMap().getContentType(filename);
		}
		return mimeType;
	}

	/**
	 * Is it a directory request ?
	 *
	 * @param uri Requested resource's URI.
	 * @return <code>true</code> when URI is a directory request
	 */
	private static boolean isDirectoryRequest(final String uri) {
		return uri.endsWith("/");
	}

	/**
	 * Retrieve file name from given URI.
	 *
	 * @param webjarsResourceURI Requested resource's URI.
	 * @return The resolved file name.
	 */
	private String getFileName(final String webjarsResourceURI) {
		final var fileName = Paths.get(webjarsResourceURI).getFileName();
		return fileName == null ? "" : fileName.toString();
	}

}
