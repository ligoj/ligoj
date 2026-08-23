/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.cxf.annotations.Provider;
import org.ligoj.app.dao.system.SystemPluginRepository;
import org.ligoj.bootstrap.core.plugin.PluginsClassLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * OpenAPI feature customized for application.
 */
@Provider(value = Provider.Type.Feature, scope = Provider.Scope.Server)
@Slf4j
@Component
public class LigojOpenApiFeature extends org.apache.cxf.jaxrs.openapi.OpenApiFeature {
	/**
	 * Return the current plug-in class loader.
	 *
	 * @return The current plug-in class loader.
	 */
	protected PluginsClassLoader getPluginClassLoader() {
		return PluginsClassLoader.getInstance();
	}

	@Autowired
	private SystemPluginRepository repository;

	/**
	 * Default constructor with version.
	 *
	 * @param version The current application version.
	 */
	@SuppressWarnings("this-escape")
	public LigojOpenApiFeature(@Value("${project.version}") final String version) {
		setLicense("MIT");
		setLicenseUrl("https://github.com/ligoj/ligoj/blob/master/LICENSE");
		setTitle("Ligoj API application");
		setContactName("GitHub Ligoj");
		setContactUrl("https://github.com/ligoj");
		setDescription("REST API services of application. Includes the core services and the features of actually loaded plugins");
		setVersion(version);
		setSecurityDefinitions(Map.of("api_key", new SecurityScheme().description("API Key").in(SecurityScheme.In.HEADER).type(SecurityScheme.Type.APIKEY).name("x-api-key"), "api_user", new SecurityScheme().description("Principal username").in(SecurityScheme.In.HEADER).type(SecurityScheme.Type.APIKEY).name("x-api-user"), "api_via_user", new SecurityScheme().description("Authenticated username when a run-as operation is needed").in(SecurityScheme.In.HEADER).type(SecurityScheme.Type.APIKEY).name("x-api-via-user")));
	}

	@PostConstruct
	void addJavadoc() throws IOException {
		// Check the available class loader for javadoc contribution
		final var classloader = getPluginClassLoader();
		if (classloader == null) {
			log.info("Plugin classLoader is not available, no javadoc providers discovery");
			return;
		}

		final var versionFileToPath = new HashMap<String, Path>();
		final var pluginFiles = classloader.getInstalledPlugins(versionFileToPath, true);
		final var javadocUrls = new ArrayList<URL>();
		for (final var path : pluginFiles.values()) {
			final var javadocPath = versionFileToPath.get(path);
			javadocUrls.add(javadocPath.toUri().toURL());
		}

		// Add resolved Javadoc URLs
		log.info("Adding javadoc providers of {} locations", javadocUrls.size());
		setCustomizer(new LigojOpenApiCustomizer(javadocUrls, repository));
	}
}
