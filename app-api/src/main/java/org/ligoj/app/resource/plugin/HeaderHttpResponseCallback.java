/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

/**
 * This callback get the header from the response.
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class HeaderHttpResponseCallback extends org.ligoj.bootstrap.core.curl.HeaderHttpResponseCallback {

	/**
	 * Simple constructor with header name for response.
	 *
	 * @param header
	 *            The header name to save as response.
	 */
	public HeaderHttpResponseCallback(final String header) {
		super(header);
	}
}
