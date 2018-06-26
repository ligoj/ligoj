/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.apache.http.client.methods.CloseableHttpResponse;

/**
 * {@link CloseableHttpResponse} callback used for each response whatever the status.
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
@FunctionalInterface
public interface HttpResponseCallback extends org.ligoj.bootstrap.core.curl.HttpResponseCallback {

	// Extended all
}
