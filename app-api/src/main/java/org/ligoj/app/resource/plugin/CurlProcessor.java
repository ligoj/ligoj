/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.ligoj.bootstrap.core.validation.ValidationJsonException;

/**
 * CURL processor.
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class CurlProcessor extends org.ligoj.bootstrap.core.curl.CurlProcessor {

	/**
	 * Prepare a processor with callback.
	 *
	 * @param callback
	 *            Not <code>null</code> {@link HttpResponseCallback} used for each response.
	 */
	public CurlProcessor(final HttpResponseCallback callback) {
		super(callback);
	}

	/**
	 * Prepare a processor with callback.
	 *
	 * @param callback
	 *            Not <code>null</code> {@link HttpResponseCallback} used for each response.
	 */
	public CurlProcessor(final org.ligoj.bootstrap.core.curl.HttpResponseCallback callback) {
		super(callback);
	}

	/**
	 * Prepare a processor without callback on response.
	 */
	public CurlProcessor() {
		super();
	}

	/**
	 * Execute the given requests.
	 *
	 * @param requests
	 *            the request to proceed.
	 * @return <code>true</code> if the process succeed.
	 */
	public boolean process(final CurlRequest... requests) {
		return super.process(requests);
	}

	/**
	 * Process the given request.
	 *
	 * @param request
	 *            The request to process.
	 * @return <code>true</code> when the call succeed.
	 */
	protected boolean process(final CurlRequest request) {
		return super.process(request);
	}

	/**
	 * Create a new processor, check the URL, and if failed, throw a {@link ValidationJsonException}
	 *
	 * @param url
	 *            The URL to check.
	 * @param propertyName
	 *            Name of the validation JSon property
	 * @param errorText
	 *            I18N key of the validation message.
	 */
	public static void validateAndClose(final String url, final String propertyName, final String errorText) {
		org.ligoj.bootstrap.core.curl.CurlProcessor.validateAndClose(url, propertyName, errorText);
	}
}
