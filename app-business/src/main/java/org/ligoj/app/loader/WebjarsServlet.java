package org.ligoj.app.loader;

import java.io.IOException;
import java.io.InputStream;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;

import lombok.extern.java.Log;

/**
 * <p>
 * This servlet enables Servlet 2.x compliant containers to serve up Webjars resources
 * </p>
 * <p>
 * Copied from org.webjars:webjars-servlet-2.x:1.5, because we need to retrieve webjars resources from Thread
 * Classloader and not only in web-inf/lib. We also removed cache management.
 * </p>
 */
@Log
public class WebjarsServlet extends HttpServlet {

	/**
	 * serial version uid
	 */
	private static final long serialVersionUID = 2461047578940577569L;

	@Override
	protected void doGet(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
		final String webjarsResourceURI = "META-INF/resources" + request.getRequestURI().replaceFirst(request.getContextPath(), "");
		log.fine("Webjars resource requested: " + webjarsResourceURI);

		if (isDirectoryRequest(webjarsResourceURI)) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		final InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(webjarsResourceURI);
		if (inputStream == null) {
			// return HTTP error
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		} else {
			try {
				final String filename = getFileName(webjarsResourceURI);
				final String mimeType = this.getServletContext().getMimeType(filename);
				if (mimeType == null) {
					response.setContentType("application/octet-stream");
				} else {
					response.setContentType(mimeType);
				}

				IOUtils.copy(inputStream, response.getOutputStream());
			} finally {
				inputStream.close();
			}
		}
	}

	/**
	 * is it a directory request ?
	 * 
	 * @param uri
	 *            uri
	 * @return true if it is a directory request
	 */
	private static boolean isDirectoryRequest(final String uri) {
		return uri.endsWith("/");
	}

	/**
	 * retrieve file name from uri
	 * 
	 * @param webjarsResourceURI
	 *            uri
	 * @return file name
	 */
	private String getFileName(final String webjarsResourceURI) {
		final String[] tokens = webjarsResourceURI.split("/");
		return tokens[tokens.length - 1];
	}

}
