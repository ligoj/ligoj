/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import org.junit.jupiter.api.Test;

/**
 * Test class of {@link AuthCurlProcessor}
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public class AuthCurlProcessorTest {

	/**
	 * Process with provided and not empty credentials.
	 */
	@Test
	public void coverageDeprecated() {
		try (AuthCurlProcessor a1 = new AuthCurlProcessor("junit", "passwd", null); AuthCurlProcessor a2 = new AuthCurlProcessor("junit", "passwd")) {
			// Nothing
		}
	}

}
