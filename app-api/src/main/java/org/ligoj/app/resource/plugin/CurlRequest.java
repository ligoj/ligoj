/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

/**
 * HTTP query to execute.
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class CurlRequest extends org.ligoj.bootstrap.core.curl.CurlRequest {

	/**
	 * All arguments constructor.
	 *
	 * @param method
	 *            HTTP method to execute, upper case.
	 * @param url
	 *            URL encoded to execute.
	 * @param content
	 *            Nullable encoded entity content to send.
	 * @param callback
	 *            Optional callback handler.
	 * @param headers
	 *            Optional headers <code>name:value</code>.
	 */
	public CurlRequest(final String method, final String url, final String content, final HttpResponseCallback callback, final String... headers) {
		super(method, url, content, callback, headers);
	}

	/**
	 * All arguments constructor but callback processor.
	 *
	 * @param method
	 *            HTTP method to execute, upper case.
	 * @param url
	 *            URL encoded to execute.
	 * @param content
	 *            Nullable encoded entity content to send.
	 * @param headers
	 *            Optional headers <code>name:value</code>.
	 */
	public CurlRequest(final String method, final String url, final String content, final String... headers) {
		super(method, url, content, headers);
	}

	/**
	 * All arguments constructor but callback processor.
	 *
	 * @param method
	 *            HTTP method to execute, upper case.
	 * @param url
	 *            URL encoded to execute.
	 */
	public CurlRequest(final String method, final String url) {
		super(method, url);
	}
}
