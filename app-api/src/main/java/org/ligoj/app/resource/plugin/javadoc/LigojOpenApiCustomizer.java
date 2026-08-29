/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import io.swagger.v3.oas.integration.api.OpenAPIConfiguration;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.cxf.jaxrs.model.ClassResourceInfo;
import org.apache.cxf.jaxrs.model.OperationResourceInfo;
import org.apache.cxf.jaxrs.model.ParameterType;
import org.apache.cxf.jaxrs.openapi.OpenApiCustomizer;
import org.ligoj.app.dao.system.SystemPluginRepository;
import org.ligoj.bootstrap.model.system.SystemPlugin;

import java.beans.Introspector;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.*;
import java.util.function.Consumer;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * OpenAPI customizer with Javadoc contribution.
 */
public class LigojOpenApiCustomizer extends OpenApiCustomizer {

	/**
	 * Empty plugin for default management.
	 */
	private static final SystemPlugin DEFAULT_PLUGIN = new SystemPlugin();
	public static final Pattern PATH_FILE_REGEXP = Pattern.compile(":.*}");

	private final SystemPluginRepository repository;

	/**
	 * Construction from Javadoc URLs and plugin registry.
	 *
	 * @param javadocUrls Source JavaDoc URLs.
	 * @param repository  Plugin registry.
	 */
	public LigojOpenApiCustomizer(List<URL> javadocUrls, SystemPluginRepository repository) {
		this.repository = repository;
		setDynamicBasePath(false);
		setJavadocProvider(new org.ligoj.app.resource.plugin.javadoc.JavadocDocumentationProvider(new URLClassLoader(javadocUrls.toArray(new URL[0]))));
	}

	@Override
	public OpenAPIConfiguration customize(final OpenAPIConfiguration configuration) {
		super.customize(configuration);
		configuration.getOpenAPI().setServers(List.of(new Server().url("./").description("REST API Server")));
		return configuration;
	}

	@Override
	protected String getNormalizedPath(String classResourcePath, String operationResourcePath) {
		final var normalizedPath = new StringBuilder();
		final var segments = (classResourcePath + operationResourcePath).split("/");
		for (var segment : segments) {
			if (!StringUtils.isEmpty(segment)) {
				// Remove parameterized notations from the key
				normalizedPath.append('/').append(PATH_FILE_REGEXP.matcher(segment).replaceAll("}"));
			}
		}
		return StringUtils.EMPTY.contentEquals(normalizedPath) ? "/" : normalizedPath.toString();
	}

	private void fillSummaryAndDescription(final String fullDoc, final Operation operation) {
		fillSummaryAndDescription(fullDoc, operation::setSummary, operation::setDescription, true);
	}

	private void fillSummaryAndDescription(final String fullDoc, final Consumer<String> setSummary, final Consumer<String> setDescription, boolean removeHtml) {
		if (fullDoc != null) {
			// Split the documentation into 'summary' and 'description'
			setSummary.accept(JavadocDocumentationProvider.normalize(StringUtils.substringBefore(fullDoc, "."), removeHtml));
			if (setDescription != null) {
				setDescription.accept(JavadocDocumentationProvider.normalize(StringUtils.substringAfter(fullDoc, "."), false));
			}
		}
	}

	/**
	 * Return the closest artifact from the given path: the plugin whose base package is the LONGEST prefix of the
	 * resource's package. On ties (several plugins registered from the same package, e.g. a service resource and a
	 * feature living side by side), the service/tool plugin wins over a plain feature — a REST route belongs to the
	 * service artifact — then the alphabetical artifact keeps the choice deterministic.
	 */
	private String getArtifact(List<SystemPlugin> plugins, HashMap<String, SystemPlugin> packageToPlugin, ClassResourceInfo cri, String pathKey) {
		var artifact = packageToPlugin.computeIfAbsent(cri.getResourceClass().getPackageName(), p -> plugins.stream()
				.filter(plugin1 -> p.startsWith(plugin1.getBasePackage()))
				.max(Comparator.comparingInt((SystemPlugin p2) -> p2.getBasePackage().length())
						.thenComparingInt(p2 -> "FEATURE".equals(p2.getType()) ? 0 : 1)
						.thenComparing(p2 -> StringUtils.defaultString(p2.getArtifact()), Comparator.reverseOrder()))
				.orElse(DEFAULT_PLUGIN)).getArtifact();
		if (artifact == null) {
			artifact = StringUtils.split(pathKey, '/')[0];
		}
		return artifact;
	}

	private void completeOperation(Map<String, String> tags, String tagOperation, ClassResourceInfo cri, OperationResourceInfo ori, Operation operation, Set<String> completedSchemas, Map<String, Schema<?>> schemas) {
		tags.computeIfAbsent(tagOperation, _ -> JavadocDocumentationProvider.normalize(javadocProvider.getClassDoc(cri), false));
		fillSummaryAndDescription(javadocProvider.getMethodDoc(ori), operation);
		for (var i = 0; i < CollectionUtils.emptyIfNull(operation.getParameters()).size(); i++) {
			operation.getParameters().get(i).setDescription(JavadocDocumentationProvider.normalize(extractJavadoc(operation, ori, i), false));
		}
		if (operation.getRequestBody() != null) {
			for (var i = 0; i < ori.getParameters().size(); i++) {
				final var parameter = ori.getParameters().get(i);
				if (parameter.getType() == ParameterType.REQUEST_BODY) {
					operation.getRequestBody().setDescription(JavadocDocumentationProvider.normalize(javadocProvider.getMethodParameterDoc(ori, i), false));
					completeSchemaDoc(operation.getRequestBody().get$ref(),
							parameter.getJavaType(),
							getGenericType(ori.getMethodToInvoke().getGenericParameterTypes()[i]), completedSchemas, schemas);
				}
			}
		}
		operation.getResponses().forEach((_, r) -> r.getContent().forEach((_, c) -> completeSchemaDoc(c.getSchema(),
				ori.getMethodToInvoke().getReturnType(),
				getGenericType(ori.getMethodToInvoke().getGenericReturnType()), completedSchemas, schemas)
		));
	}

	/**
	 * Return the first generic type's argument if any.
	 *
	 * @param generic The type to inspect.
	 * @return The first generic type's argument if any.
	 */
	Class<?> getGenericType(final Type generic) {
		if (generic instanceof ParameterizedType param
				&& param.getActualTypeArguments().length > 0
				&& param.getActualTypeArguments()[0] instanceof Class) {
			return (Class<?>) param.getActualTypeArguments()[0];
		}
		return null;
	}

	/**
	 * Complete the given schema's documentation
	 */
	void completeSchemaDoc(Schema<?> schema, Class<?> javaClass, Class<?> genericType, Set<String> completedSchemas, Map<String, Schema<?>> schemas) {
		if (schema == null) {
			return;
		}
		completeSchemaDoc(schema.get$ref(), javaClass, genericType, completedSchemas, schemas); // #/components/schemas/NodeVo
	}

	private void completeSchemaDoc(String ref, Class<?> javaClass, Class<?> genericType, Set<String> completedSchemas, Map<String, Schema<?>> schemas) {
		if (ref != null && javaClass != null && javaClass.getName().startsWith("org.ligoj.") && completedSchemas.add(ref)) {
			var parts = ref.split("/");
			var name = parts[parts.length - 1];
			final var schema = schemas.get(name);
			if (schema != null) {
				// Complete doc of this type
				schema.setDescription(((JavadocDocumentationProvider) javadocProvider).getClassDoc(javaClass));
				@SuppressWarnings("rawtypes") final Map<String, Schema> properties = Objects.requireNonNullElse(schema.getProperties(), Collections.emptyMap());
				properties.forEach((p, pSchema) -> {
					if (pSchema instanceof ArraySchema) {
						completeSchemaDoc(pSchema.getItems(), genericType, null, completedSchemas, schemas);
					} else {
						pSchema.setDescription(getGetterDoc(p, javaClass, genericType));
					}
				});
			}
		}
	}

	/**
	 * Return the documentation of getter method of given attribute.
	 *
	 * @param name        Attribute name.
	 * @param javaClass   Bean class
	 * @param genericType Alternate bean class resolved from generic type.
	 * @return The documentation of getter method of given attribute.
	 */
	String getGetterDoc(final String name, final Class<?> javaClass, final Class<?> genericType) {
		return Stream.of(javaClass, genericType).filter(Objects::nonNull).map(t -> getGetterDoc(name, t)).filter(Objects::nonNull).findFirst().orElse(null);
	}

	private String getGetterDoc(final String name, final Class<?> javaClass) {
		try {
			for (final var pd : Introspector.getBeanInfo(javaClass).getPropertyDescriptors()) {
				if (pd.getReadMethod() != null && name.equals(pd.getName())) {
					return ((JavadocDocumentationProvider) javadocProvider).getMethodDoc(pd.getReadMethod());
				}
			}
		} catch (final Exception _) {
			// Ignore
		}
		return null;
	}

	@Override
	public void customize(final OpenAPI oas) {
		final var operations = new HashMap<String, ClassResourceInfo>();
		final var methods = new HashMap<Pair<String, String>, OperationResourceInfo>();
		cris.forEach(cri -> cri.getMethodDispatcher().getOperationResourceInfos().forEach(ori -> {
			var normalizedPath = getNormalizedPath(cri.getURITemplate().getValue(), ori.getURITemplate().getValue());
			operations.put(normalizedPath, cri);
			methods.put(Pair.of(ori.getHttpMethod(), normalizedPath), ori);
		}));

		// Check Javadoc completeness is necessary
		if (oas.getExtensions() != null) {
			// Cached
			return;
		}
		// Reorder the OpenAPI path by natural language
		final var sortedPaths = new Paths();
		oas.setExtensions(Map.of("sort", new PathItem()));
		oas.getPaths().entrySet().stream().sorted(Comparator.comparing(path -> path.getKey().replace('{', '_'))).forEach(entry -> sortedPaths.addPathItem(entry.getKey(), entry.getValue()));
		oas.setPaths(sortedPaths);

		// Complete doc and tags
		final var plugins = repository.findAll().stream().filter(p -> p.getBasePackage() != null).toList();
		final var packageToPlugin = new HashMap<String, SystemPlugin>();
		final var tags = new HashMap<String, String>();
		final Set<String> completedSchemas = new HashSet<>();
		oas.getPaths().forEach((pathKey, pathItem) -> {
			var cri = operations.get(pathKey);
			if (cri == null) {
				return;
			}
			final var tagOperation = getArtifact(plugins, packageToPlugin, cri, pathKey);
			pathItem.readOperationsMap().forEach((method, operation) -> {
				operation.setTags(Collections.singletonList(tagOperation));
				var key = Pair.of(method.name(), pathKey);
				final var ori = methods.get(key);
				if (ori != null) {
					@SuppressWarnings("unchecked") final var schemas = (Map<String, Schema<?>>) (Map<?, ?>) oas.getComponents().getSchemas();
					completeOperation(tags, tagOperation, cri, ori, operation, completedSchemas, schemas);
				}
			});
		});
		oas.setTags(tags.keySet().stream().sorted().map(t -> {
			final var tag = new Tag().name(t);
			fillSummaryAndDescription(tags.get(t), tag::description, null, false);
			return tag;
		}).toList());
		oas.getComponents().setSchemas(new TreeMap<>(oas.getComponents().getSchemas()));
	}
}
