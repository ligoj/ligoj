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
	 */
	public PluginApplicationRunListener(final SpringApplication application, final String... args) throws IOException {
		if (PluginsClassLoader.getInstance() == null) {
			// Replace the main class loader
			log.info("Restore the plugin classloader for application {}({})", application, args);
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
	public void finished(final ConfigurableApplicationContext context,final Throwable exception) {
		// Nothing to do
	}

}
