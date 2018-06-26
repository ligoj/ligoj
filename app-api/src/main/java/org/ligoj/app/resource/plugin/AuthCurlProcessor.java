/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.apache.http.auth.AUTH;

/**
 * Basic authenticated CURL processor. Credentials are sent in each request.
 *
 * @see SessionAuthCurlProcessor for session based cookie after a Basi authentication.
 * @see AUTH#WWW_AUTH_RESP
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class AuthCurlProcessor extends org.ligoj.bootstrap.core.curl.AuthCurlProcessor {

	/**
	 * Full constructor holding credential and callback.
	 *
	 * @param username
	 *            the user login. Empty or null login are accepted, but no authentication will be used.
	 * @param password
	 *            the user password or API token. <code>null</code> Password is converted to empty string, and still
	 *            used when user is not empty.
	 * @param callback
	 *            Not <code>null</code> {@link HttpResponseCallback} used for each response.
	 */
	public AuthCurlProcessor(final String username, final String password, final HttpResponseCallback callback) {
		super(username, password, callback);
	}

	/**
	 * Constructor using parameters set.
	 *
	 * @param username
	 *            the user login. Empty or null login are accepted, but no authentication will be used.
	 * @param password
	 *            the user password or API token. <code>null</code> Password is converted to empty string, and still
	 *            used when user is not empty.
	 */
	public AuthCurlProcessor(final String username, final String password) {
		super(username, password);
	}

}
