/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.plugin;

import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import org.ligoj.bootstrap.core.NamedBean;
import org.ligoj.bootstrap.core.plugin.FeaturePlugin;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.springframework.stereotype.Component;

/**
 * Sample tool for test.
 */
@Path("mock/sample1")
@Component
public class SampleTool1 implements FeaturePlugin {

	@Override
	public String getKey() {
		return "service:sample:tool1";
	}

	/**
	 * Method doc. Details.
	 *
	 * @param param1 Param1 doc.
	 * @param user   User doc. Details.
	 * @return Return doc
	 */
	@POST
	public NamedBean<String> test1(@QueryParam("param1") String param1, SystemUser user) {
		return new NamedBean<>();
	}

	/**
	 * Method2 doc. Details.
	 *
	 * @param param2 Param2 doc.
	 * @return Return2 doc
	 */
	@POST
	public String test2(@QueryParam("param1") String param2) {
		return "Hello";
	}

}
