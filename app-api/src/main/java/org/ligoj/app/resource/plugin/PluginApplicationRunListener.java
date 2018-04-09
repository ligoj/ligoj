/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.io.IOException;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

import lombok.extern.slf4j.Slf4j;

/**
 * Application listener able to alter the class loader to the plugin class-loader.
 */
@Slf4j
public class PluginApplicationRunListener implements SpringApplicationRunListener, Ordered {

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
		if (PluginsClassLoader.getInstance() == null) {
			// Replace the main class loader
			log.info("Install the plugin classloader for application {}({})", application, args);
			Thread.currentThread().setContextClassLoader(new PluginsClassLoader());
		}
	}

	@Override
	public void starting() {
		// Nothing to do
	}

	@Override
	public int getOrder() {
		// Be sure to be executed before EventPublishingRunListener
		return -10;
	}

	@Override
	public void environmentPrepared(final ConfigurableEnvironment environment) {
		// Nothing to do
	}

	@Override
	public void contextPrepared(final ConfigurableApplicationContext context) {
		// Nothing to do
	}

	@Override
	public void contextLoaded(final ConfigurableApplicationContext context) {
		// Nothing to do
	}

	@Override
	public void failed(ConfigurableApplicationContext context, Throwable exception) {
		// Nothing to do
		log.error("Context failed to start", exception);
	}

	@Override
	public void running(ConfigurableApplicationContext context) {
		// Nothing to do
	}

	@Override
	public void started(ConfigurableApplicationContext context) {
		// Nothing to do
	}

}
