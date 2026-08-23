/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

/**
 * Simple interface REST contract for test.
 */
@Path("mock/sample4")
public interface RestContract {

	@GET
	default String test() {
		return "Hello";
	}

}
