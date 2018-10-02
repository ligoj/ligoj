/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.io.IOException;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;

/**
 * Application listener able to alter the class loader to the plug-in class-loader.
 */
public class PluginApplicationRunListener extends org.ligoj.bootstrap.resource.system.plugin.PluginApplicationRunListener {

	/**
	 * Required Spring-Boot constructor to be compliant to {@link SpringApplicationRunListener}
	 *
	 * @param application
	 *            The current application.
	 * @param args
	 *            The application arguments.
	 * @throws IOException
	 *             When reading plug-ins directory
	 */
	public PluginApplicationRunListener(final SpringApplication application, final String... args) throws IOException {
		super(application, args);
	}

	@Override
	protected void replaceClassLoader() throws IOException {
		Thread.currentThread().setContextClassLoader(new LigojPluginsClassLoader());
	}
}
