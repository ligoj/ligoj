package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.ligoj.app.api.PluginException;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Class Loader which load jars in {@value #PLUGINS_DIR} directory inside the home directory.
 */
@Slf4j
@Getter
public class PluginsClassLoader extends URLClassLoader {

	/**
	 * System property name pointing to the home directory. When undefined, system user home directory will be used
	 */
	public static final String HOME_DIR_PROPERTY = "ligoj.home";

	/**
	 * Default home directory part used in addition of system user home directory : "/home/my-user" for sample.
	 */
	public static final String HOME_DIR_FOLDER = ".ligoj";
	/**
	 * Plug-ins directory inside the home property
	 */
	public static final String PLUGINS_DIR = "plugins";
	/**
	 * Plug-ins export directory inside the home property
	 */
	public static final String EXPORT_DIR = "export";

	/**
	 * Pattern used to extract the version from a JAR plugin file name.
	 */
	private static final Pattern VERSION_PATTERN = Pattern.compile("(-(\\d+(\\.\\d+){1,3}(-SNAPSHOT)?))\\.jar$");

	/**
	 * The application home directory.
	 */
	private final Path homeDirectory;

	/**
	 * The plug-in directory, inside the home directory.
	 */
	private Path pluginDirectory;

	/**
	 * Initialize the plug-in {@link URLClassLoader} and the related directories.
	 * 
	 * @throws IOException
	 *             exception when reading plug-ins directory
	 */
	public PluginsClassLoader() throws IOException {
		super(new URL[0], Thread.currentThread().getContextClassLoader());
		this.homeDirectory = computeHome();
		this.pluginDirectory = this.homeDirectory.resolve(PLUGINS_DIR);

		// Create the plug-in directory as needed
		log.info("Initialize the plug-ins from directory from {}", homeDirectory);
		Files.createDirectories(this.pluginDirectory);

		// Add the home it self in the class-path
		addURL(this.homeDirectory.toUri().toURL());

		// Build the plug-ins list with full version to filter the oldest versions
		final Map<String, Path> versionFileToPath = new HashMap<>();
		final Map<String, String> versionFiles = new TreeMap<>();
		Files.list(this.pluginDirectory).filter(p -> p.toString().endsWith(".jar"))
				.forEach(path -> addVersionFile(versionFileToPath, versionFiles, path));

		// Remove old plug-in from the list
		final Map<String, String> mostRecentPlugins = new TreeMap<>(Comparator.reverseOrder());
		versionFiles.keySet().stream().sorted(Comparator.reverseOrder()).filter(p -> !mostRecentPlugins.containsKey(versionFiles.get(p)))
				.forEach(p -> mostRecentPlugins.put(versionFiles.get(p), p));

		// Add the filtered plug-in files to the class-path
		for (final String versionFile : mostRecentPlugins.values()) {
			final URI uri = versionFileToPath.get(versionFile).toUri();
			log.debug("Add plugin {}", uri);
			copyExportedResources(versionFiles.get(versionFile), versionFileToPath.get(versionFile), uri);
		}
		log.info("Plugins ClassLoader has added {} plug-ins and ignored {} old plug-ins", mostRecentPlugins.size(),
				versionFiles.size() - mostRecentPlugins.size());
	}

	/**
	 * Return the plug-in class loader from the current class loader.
	 * 
	 * @return the closest {@link PluginsClassLoader} instance from the current thread's {@link ClassLoader}. May be
	 *         <code>null</code>.
	 */
	public static PluginsClassLoader getInstance() {
		return getInstance(Thread.currentThread().getContextClassLoader());
	}

	/**
	 * Return the plug-in class loader from the given class loader's hierarchy.
	 * 
	 * @param cl
	 *            The {@link ClassLoader} to inspect.
	 * @return the closest {@link PluginsClassLoader} instance from the current thread's {@link ClassLoader}. May be
	 *         <code>null</code>.
	 */
	public static PluginsClassLoader getInstance(final ClassLoader cl) {
		if (cl == null) {
			// A separate class loader ?
			log.warn("PluginsClassLoader requested but not found in the current classloader hierarchy {}",
					Thread.currentThread().getContextClassLoader().toString());
			return null;
		}
		if (cl instanceof PluginsClassLoader) {
			// Class loader has been found
			return (PluginsClassLoader) cl;
		}

		// Try the parent
		return getInstance(cl.getParent());
	}

	/**
	 * Copy resources needed to be exported from the JAR plug-in to the home.
	 */
	protected void copyExportedResources(final String plugin, final Path pluginFile, final URI uri) throws IOException {
		FileSystem fileSystem = null;
		try {
			fileSystem = FileSystems.newFileSystem(pluginFile, this);
			final Path export = fileSystem.getPath("/" + EXPORT_DIR);
			if (Files.exists(export)) {
				final Path targetExport = getHomeDirectory().resolve(EXPORT_DIR);
				Files.walk(export).forEach(from -> copyExportedResource(plugin, targetExport, export, from));
			}
		} finally {
			IOUtils.closeQuietly(fileSystem);
		}
		addURL(uri.toURL());
	}

	/**
	 * Copy a resource as needed to be exported from the JAR plug-in to the home.
	 */
	private void copyExportedResource(final String plugin, final Path targetExport, final Path root, final Path from) {
		final Path dest = targetExport.resolve(root.relativize(from).toString());
		// Copy without overwrite
		if (!dest.toFile().exists()) {
			try {
				copy(from, dest);
			} catch (final IOException e) {
				throw new PluginException(plugin, String.format("Unable to copy exported resource %s to %s", from, dest.toString()), e);
			}
		}
	}

	/**
	 * Copy a resource needed to be exported from the JAR plug-in to the home.
	 */
	protected void copy(final Path from, final Path dest) throws IOException {
		if (Files.isDirectory(from)) {
			Files.createDirectories(dest);
		} else {
			Files.copy(from, dest);
		}
	}

	private void addVersionFile(final Map<String, Path> versionFileToPath, final Map<String, String> versionFiles, final Path path) {
		final String file = path.getFileName().toString();
		final Matcher matcher = VERSION_PATTERN.matcher(file);
		final String noVersionFile;
		final String fileWithExtVersion;
		if (matcher.find()) {
			// This plug-in has a version, extend the version for the next natural string ordering
			noVersionFile = file.substring(0, matcher.start());
			fileWithExtVersion = noVersionFile + "-" + toExtendedVersion(matcher.group(1));

		} else {
			// No version, the file will be kept with the lowest level version number
			noVersionFile = FilenameUtils.removeExtension(file);
			fileWithExtVersion = noVersionFile + "-0";
		}

		// Store the version files to keep later only the most recent one
		versionFileToPath.put(fileWithExtVersion, path);
		versionFiles.put(fileWithExtVersion, noVersionFile);
	}

	/**
	 * Convert a version to a comparable string and following the semver specification. Maximum 4 version ranges are
	 * accepted.
	 * 
	 * @param version
	 *            The version string to convert.
	 * @return The given version to be comparable with another version. Handle the 'SNAPSHOT' case considered has oldest
	 *         than the one without this suffix.
	 */
	private String toExtendedVersion(final String version) {
		final StringBuilder fileWithVersionExp = new StringBuilder();
		final String[] versionFragments = StringUtils.split(version, "-.");
		final String[] allFragments = { "0", "0", "0", "0" };
		System.arraycopy(versionFragments, 0, allFragments, 0, versionFragments.length);
		Arrays.stream(allFragments).map(s -> StringUtils.leftPad(StringUtils.leftPad(s, 7, '0'), 8, 'Z')).forEach(fileWithVersionExp::append);
		return fileWithVersionExp.toString();
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
