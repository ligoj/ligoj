package org.ligoj.app.loader;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import lombok.extern.slf4j.Slf4j;

/**
 * Class Loader which load jars in {@value #PLUGINS_DIR} directory inside the home directory.
 */
@Slf4j
public class PluginsClassLoader extends URLClassLoader {

	private final Path homeDirectory;

	/**
	 * The plug-in directory
	 */
	private Path pluginDirectory;

	/**
	 * Plug-ins directory inside the home property
	 */
	public static final String PLUGINS_DIR = "plugins";

	/**
	 * Default home directory part used in addition of system user home directory : "/home/my-user" for sample.
	 */
	public static final String HOME_DIR_FOLDER = ".ligoj";

	/**
	 * System property name pointing to the home directory. When undefined, system user home directory will be used
	 */
	public static final String HOME_DIR_PROPERTY = "ligoj.home";

	/**
	 * Initialize the plugin {@link URLClassLoader} and the related directories.
	 * 
	 * @throws IOException
	 *             exception when reading plugins directory
	 */
	public PluginsClassLoader() throws IOException {
		super(new URL[0], Thread.currentThread().getContextClassLoader());
		this.homeDirectory = computeHome();
		this.pluginDirectory = this.homeDirectory.resolve(PLUGINS_DIR);

		// Create the plug-in directory as needed
		log.info("Initialize the plug-ins from directory from {}", homeDirectory);
		Files.createDirectories(this.pluginDirectory);

		log.info("Load plugins throught Custom Plugins ClassLoader");
		for (final URI uri : Files.list(this.pluginDirectory).filter(p -> p.toString().endsWith(".jar")).map(Path::toUri).toArray(URI[]::new)) {
			log.info("Add plugin {}", uri);
			addURL(uri.toURL());
		}
	}

	/**
	 * Compute the right home directory for the application from the system properties.
	 * 
	 * @return The computed home directory.
	 */
	protected Path computeHome() {
		final Path homeDir;
		if (System.getProperty(HOME_DIR_PROPERTY) == null) {
			// Non standard home directory
			homeDir = Paths.get(System.getProperty("user.home"), HOME_DIR_FOLDER);
			log.info("Home directory is '{}', resolved from current home user location. Use '{}' system property to override this path", homeDir,
					HOME_DIR_PROPERTY);
		} else {
			// Home directory inside the system user's home directory
			homeDir = Paths.get(System.getProperty(HOME_DIR_PROPERTY));
			log.info("Home directory is '{}', resolved from the system property '{}'", homeDir, HOME_DIR_PROPERTY);
		}
		return homeDir;
	}

}
