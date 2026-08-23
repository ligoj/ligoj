/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import lombok.extern.slf4j.Slf4j;
import org.ligoj.bootstrap.core.plugin.PluginsClassLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.Ordered;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;

/**
 * Application listener able to alter the class loader to the plug-in class-loader.
 */
@Slf4j
public class PluginApplicationRunListener implements SpringApplicationRunListener, Ordered {

	/**
	 * Required Spring-Boot constructor to be compliant to {@link SpringApplicationRunListener}
	 *
	 * @param application The current application.
	 * @param args        The application arguments.
	 */
	@SuppressWarnings("this-escape")
	public PluginApplicationRunListener(final SpringApplication application, final String... args) {
		try {
			if (PluginsClassLoader.getInstance() == null) {
				// Replace the main class loader
				log.info("Install the plugin classloader for application {}({})", application, args);
				replaceClassLoader();
			}
			log.info("Application listener and plugin classloader are now configured");
		} catch(final Throwable t){
			log.error("Application listener and/or plugin classloader failed, degraded execution", t);
		}
	}

	/**
	 * Replace the current classloader by a {@link PluginsClassLoader} instance.
	 *
	 * @throws IOException              When the setup failed.
	 * @throws NoSuchAlgorithmException MD5 digest is unavailable for version ciphering.
	 */
	protected void replaceClassLoader() throws IOException, NoSuchAlgorithmException {
		Thread.currentThread().setContextClassLoader(new LigojPluginsClassLoader());
	}

	@Override
	public int getOrder() {
		// Be sure to be executed before EventPublishingRunListener
		return -10;
	}

	@Override
	public void failed(ConfigurableApplicationContext context, Throwable exception) {
		// Nothing to do
		log.error("Context failed to start", exception);
	}

}
