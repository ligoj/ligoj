package org.ligoj.app.loader;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.ligoj.bootstrap.core.resource.TechnicalException;
import lombok.extern.slf4j.Slf4j;

/**
 * Class Loader which load jars in 'plugins.dir' directory
 */
@Slf4j
public class PluginsClassLoader extends URLClassLoader {

	/**
	 * Plug-ins directory system property
	 */
	public static final String PLUGINS_DIR = "plugins.dir";

	/**
	 * default constructor
	 * 
	 * @throws IOException
	 *             exception when reading plugins directory
	 */
	public PluginsClassLoader() throws IOException {
		super(new URL[0], Thread.currentThread().getContextClassLoader());
		log.info("Load plugins throught Custom Plugins ClassLoader");
		final String pluginsDir = System.getProperty(PLUGINS_DIR);
		if (pluginsDir == null) {
			log.error("Plugins Directory (system property 'plugins.dir') is missing.");
			throw new TechnicalException("Plugins Directory is missing.");
		}
		for (final URI uri : Files.list(Paths.get(pluginsDir)).filter(p -> p.toString().endsWith(".jar")).map(Path::toUri).toArray(URI[]::new)) {
			addURL(uri.toURL());
		}
	}

}
