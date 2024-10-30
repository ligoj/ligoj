/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.api;

import jakarta.activation.FileTypeMap;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Paths;
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

	@Override
	protected void doGet(final HttpServletRequest request, final HttpServletResponse response)
			throws IOException {
		final var webjarsResourceURI = "META-INF/resources"
				+ request.getRequestURI().replaceFirst(request.getContextPath(), "");
		log.debug("Webjars requested resource: {}", webjarsResourceURI);

		if (isDirectoryRequest(webjarsResourceURI)) {
			// Directory listing is forbidden, but act as a 404 for security purpose.
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		// Regular file, use the last resource instead of the first found
		var resources = Thread.currentThread().getContextClassLoader().getResources(webjarsResourceURI);
		URL webjarsResourceURL = null;
		if (resources.hasMoreElements()) {
			webjarsResourceURL = resources.nextElement();
		}
		if (resources.hasMoreElements()) {
			var webjarsResourceFileUrl = resources.nextElement();
			if (webjarsResourceFileUrl.toString().startsWith("file:")) {
				// Highest priority for local files
				webjarsResourceURL = webjarsResourceFileUrl;
			}
		}

		if (webjarsResourceURL == null) {
			// File not found --> 404
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		} else {
			log.debug("Webjars resolved resource: {}", webjarsResourceURL);
			while (resources.hasMoreElements()) {
				log.debug("Webjars resolved resource (ignored): {}", resources.nextElement());
			}
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
		return Paths.get(webjarsResourceURI).toFile().getName();
	}

}
