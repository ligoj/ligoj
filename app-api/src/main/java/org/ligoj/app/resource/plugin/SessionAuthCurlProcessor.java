/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

/**
 * Basic authenticated CURL processor where credentials are only sent one in order to get a session cookie.
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class SessionAuthCurlProcessor extends org.ligoj.bootstrap.core.curl.SessionAuthCurlProcessor {

	/**
	 * Full constructor holding credential and callback.
	 *
	 * @param username
	 *            the user login.
	 * @param password
	 *            the user password or API token.
	 * @param callback
	 *            Not <code>null</code> {@link HttpResponseCallback} used for each response.
	 */
	public SessionAuthCurlProcessor(final String username, final String password, final HttpResponseCallback callback) {
		super(username, password, callback);
	}

	/**
	 * Constructor using parameters set.
	 *
	 * @param username
	 *            the user login.
	 * @param password
	 *            the user password or API token.
	 */
	public SessionAuthCurlProcessor(final String username, final String password) {
		super(username, password);
	}
}
