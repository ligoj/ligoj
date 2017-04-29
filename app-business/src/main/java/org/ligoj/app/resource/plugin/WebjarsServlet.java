package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;

import javax.activation.FileTypeMap;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;

import lombok.extern.slf4j.Slf4j;

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

	@Override
	protected void doGet(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
		final String webjarsResourceURI = "META-INF/resources" + request.getRequestURI().replaceFirst(request.getContextPath(), "");
		log.debug("Webjars resource requested: {}", webjarsResourceURI);

		if (isDirectoryRequest(webjarsResourceURI)) {
			// Directory listing is forbidden, but act as a 404 for security purpose.
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		// Regular file
		final InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(webjarsResourceURI);
		if (inputStream == null) {
			// File not found --> 404
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		} else {
			serveFile(response, webjarsResourceURI, inputStream);
		}
	}

	/**
	 * Copy the file stream to the response using the right mime type
	 */
	private void serveFile(final HttpServletResponse response, final String webjarsResourceURI, final InputStream inputStream) throws IOException {
		try {
			final String filename = getFileName(webjarsResourceURI);
			response.setContentType(guessMimeType(filename));
			IOUtils.copy(inputStream, response.getOutputStream());
			response.flushBuffer();
		} finally {
			inputStream.close();
		}
	}

	/**
	 * Guess the MIME type from the file name
	 */
	protected String guessMimeType(final String filename) {
		// First, get the mime type provided by the Servlet container
		String mimeType = this.getServletContext().getMimeType(filename);
		if (mimeType == null) {
			// Use the mime type guess by JSE
			mimeType = FileTypeMap.getDefaultFileTypeMap().getContentType(filename);
		}
		return mimeType;
	}

	/**
	 * Is it a directory request ?
	 * 
	 * @param uri
	 *            Requested resource's URI.
	 * @return <code>true</code> when URI is a directory request
	 */
	private static boolean isDirectoryRequest(final String uri) {
		return uri.endsWith("/");
	}

	/**
	 * Retrieve file name from given URI.
	 * 
	 * @param webjarsResourceURI
	 *            Requested resource's URI.
	 * @return file name
	 */
	private String getFileName(final String webjarsResourceURI) {
		return Paths.get(webjarsResourceURI).toFile().getName();
	}

}
