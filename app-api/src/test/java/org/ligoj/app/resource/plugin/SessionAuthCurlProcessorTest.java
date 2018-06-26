/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.junit.jupiter.api.Test;

/**
 * Test class of {@link SessionAuthCurlProcessor}
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class SessionAuthCurlProcessorTest {

	/**
	 * First request means authentication token sent.
	 */
	@Test
	public void coverageDeprecated() {
		new SessionAuthCurlProcessor("junit", "passwd", null);
		new SessionAuthCurlProcessor("junit", "passwd");
	}
}
