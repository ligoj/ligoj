/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import io.swagger.v3.oas.integration.SwaggerConfiguration;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.apache.commons.lang3.reflect.MethodUtils;
import org.apache.cxf.jaxrs.model.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.ligoj.app.dao.system.SystemPluginRepository;
import org.ligoj.app.resource.plugin.SampleTool1;
import org.ligoj.app.resource.plugin.SampleTool2;
import org.ligoj.bootstrap.core.curl.CurlProcessor;
import org.ligoj.bootstrap.model.system.SystemPlugin;
import org.ligoj.bootstrap.model.system.SystemRole;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.mockito.Mockito;

import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test class of {@link LigojOpenApiCustomizer}
 */
class LigojOpenApiCustomizerTest extends AbstractJavaDocTest {

	private LigojOpenApiCustomizer customizer;

	@BeforeEach
	void configure() throws IOException {
		final var javadocUrls = newJavadocUrls();
		final var repository = mock(SystemPluginRepository.class);
		final var plugin1 = new SystemPlugin();
		plugin1.setBasePackage(SampleTool2.class.getPackageName());
		plugin1.setArtifact("tool1");
		final var plugin2 = new SystemPlugin();
		plugin2.setBasePackage("org.ligoj.bootstrap.resource");
		plugin2.setArtifact("tool2");
		final var plugin3 = new SystemPlugin();
		plugin3.setBasePackage("foo.bar");
		plugin3.setArtifact("tool3");
		final var pluginNoPackage = new SystemPlugin();
		pluginNoPackage.setArtifact("toolNoPackage");
		Mockito.doReturn(List.of(plugin1, plugin2, plugin3, pluginNoPackage)).when(repository).findAll();
		customizer = new LigojOpenApiCustomizer(javadocUrls, repository);
	}

	@Test
	void customize() {
		final var configuration = new SwaggerConfiguration();
		configuration.setOpenAPI(new OpenAPI());
		customizer.customize(configuration);
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		cri1.setMethodDispatcher(new MethodDispatcher());
		cri1.setURITemplate(new URITemplate("mock/sample1"));
		final var method = MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class);
		final var parameter1 = new Parameter(ParameterType.QUERY, 0, "param1");
		parameter1.setJavaType(String.class);
		final var parameter2 = new Parameter(ParameterType.REQUEST_BODY, 1, "user");
		parameter2.setJavaType(SystemUser.class);
		final var ori = new OperationResourceInfo(method, cri1, new URITemplate("/{param1:regEx}"), "POST", "application/json", "application/json", List.of(parameter1, parameter2), true);
		cri1.getMethodDispatcher().bind(ori, method);
		final var oriNotExists = new OperationResourceInfo(method, cri1, new URITemplate("/not-exists"), "PATCH", null, null, Collections.emptyList(), true);
		final var methodNotExist = mock(Method.class);
		Mockito.doReturn("not-exists").when(methodNotExist).getName();
		cri1.getMethodDispatcher().bind(oriNotExists, methodNotExist);

		final var cri2 = new ClassResourceInfo(SampleTool2.class);
		cri2.setMethodDispatcher(new MethodDispatcher());
		cri2.setURITemplate(new URITemplate("mock/sample2"));
		final var method2 = MethodUtils.getMatchingMethod(SampleTool2.class, "test");
		final var ori2 = new OperationResourceInfo(method2, cri2, new URITemplate(""), "GET", "application/json", "application/json", Collections.emptyList(), true);
		cri2.getMethodDispatcher().bind(ori2, method2);

		final var cri3 = new ClassResourceInfo(SystemPlugin.class);
		cri3.setMethodDispatcher(new MethodDispatcher());
		cri3.setURITemplate(new URITemplate("mock/sample3"));
		final var method3 = MethodUtils.getMatchingMethod(SystemPlugin.class, "getVersion");
		final var ori3 = new OperationResourceInfo(method3, cri3, new URITemplate(""), "GET", "application/json", "application/json", Collections.emptyList(), true);
		cri3.getMethodDispatcher().bind(ori3, method3);

		final var cri4 = new ClassResourceInfo(SampleTool2.class);
		cri4.setMethodDispatcher(new MethodDispatcher());

		final var cris = List.of(cri1, cri2, cri3, cri4);
		customizer.setClassResourceInfos(cris);
		final var oas = new OpenAPI();

		// Build schemas
		var stringSchema = new StringSchema();
		var lastConnectionSchema = new StringSchema();
		var loginSchema = new StringSchema();
		var systemRoleAssignmentArraySchema = new ArraySchema();
		var systemRoleAssignmentSchema = new Schema<>().$ref("#/components/schemas/SystemRoleAssignment");
		systemRoleAssignmentArraySchema.setItems(systemRoleAssignmentSchema);
		@SuppressWarnings("unchecked") var systemUserSchema = new Schema<>().$ref("#/components/schemas/SystemUser").properties(Map.of("login", loginSchema, "lastConnection", lastConnectionSchema, "roles", systemRoleAssignmentArraySchema));
		@SuppressWarnings("unchecked") var namedBeanSchema = new Schema<>().$ref("#/components/schemas/NamedBeanString").properties(Map.of("name", stringSchema));
		oas.setComponents(new Components());
		oas.getComponents().setSchemas(Map.of("SystemUser", systemUserSchema, "NamedBeanString", namedBeanSchema));

		// Operation1
		final var sortedPaths = new io.swagger.v3.oas.models.Paths();

		final var pathItem1 = new PathItem();
		final var oasOperation = new Operation();
		pathItem1.operation(PathItem.HttpMethod.POST, oasOperation);

		final var oasStringParameter = new io.swagger.v3.oas.models.parameters.Parameter().name("param1");
		oasOperation.setResponses(new ApiResponses());
		oasOperation.setParameters(List.of(oasStringParameter));
		oasOperation.setRequestBody(new RequestBody().$ref("#/components/schemas/SystemUser"));
		oasOperation.setResponses(new ApiResponses());
		var response = new ApiResponse();
		oasOperation.getResponses().put("default", response);
		var content = new Content();
		response.setContent(content);
		var media = new MediaType();
		content.put("application/json", media);
		media.setSchema(namedBeanSchema);
		sortedPaths.put("/mock/sample1/{param1}", pathItem1);
		sortedPaths.put("/mock/sample1/not-exists", pathItem1);

		// Operation2
		final var pathItem2 = new PathItem();
		final var oasOperation2 = new Operation();
		oasOperation2.setResponses(new ApiResponses());
		pathItem2.operation(PathItem.HttpMethod.GET, oasOperation2);
		sortedPaths.put("/mock/sample2", pathItem2);
		sortedPaths.put("/mock/sample3", new PathItem());
		sortedPaths.put("/foo/bar", new PathItem());
		oas.setPaths(sortedPaths);

		customizer.customize(oas);

		// Repeat with cache
		customizer.customize(oas);

		Assertions.assertEquals("Method doc", oasOperation.getSummary());
		Assertions.assertEquals("Details", oasOperation.getDescription());
		Assertions.assertEquals("User doc. Details", oasOperation.getRequestBody().getDescription());
		Assertions.assertEquals("Param1 doc", oasStringParameter.getDescription());

		// Schema doc
		Assertions.assertEquals("A named bean", namedBeanSchema.getDescription());
		Assertions.assertEquals("Corporate user", systemUserSchema.getDescription());
		Assertions.assertEquals("Corporate user login", ((Schema<?>) systemUserSchema.getProperties().get("login")).getDescription());
		Assertions.assertEquals("Last known connection", ((Schema<?>) systemUserSchema.getProperties().get("lastConnection")).getDescription());

	}

	@Test
	void normalize() {
		Assertions.assertEquals("/root/path/{foo}/{bar}", customizer.getNormalizedPath("/root", "/path/{foo:some}/{bar:other}"));
		Assertions.assertEquals("/", customizer.getNormalizedPath("", ""));
		Assertions.assertEquals("/", customizer.getNormalizedPath("", "//"));
	}

	@Test
	void getGetterDoc() {
		Assertions.assertNull(customizer.getGetterDoc(null, String.class, String.class));
		Assertions.assertNull(customizer.getGetterDoc("any", String.class, null));
		Assertions.assertNull(customizer.getGetterDoc("coder", String.class, null));
		Assertions.assertNull(customizer.getGetterDoc("any", SystemUser.class, null));
		Assertions.assertNull(customizer.getGetterDoc("callback", CurlProcessor.class, null));
		Assertions.assertEquals("Corporate user login", customizer.getGetterDoc("login", SystemUser.class, null));
		Assertions.assertEquals("Corporate user login", customizer.getGetterDoc("login", String.class, SystemUser.class));
		Assertions.assertEquals("Last known connection", customizer.getGetterDoc("lastConnection", SystemUser.class, SystemUser.class));
		Assertions.assertEquals("Last known connection", customizer.getGetterDoc("lastConnection", SystemUser.class, SystemUser.class));
	}

	@Test
	void getGenericType() {
		Assertions.assertNull(customizer.getGenericType(null));
		Assertions.assertNull(customizer.getGenericType(mock(Type.class)));
		var parameterizedTypeEmpty = mock(ParameterizedType.class);
		when(parameterizedTypeEmpty.getActualTypeArguments()).thenReturn(new Type[]{});
		Assertions.assertNull(customizer.getGenericType(parameterizedTypeEmpty));
		var parameterizedTypes = mock(ParameterizedType.class);
		when(parameterizedTypes.getActualTypeArguments()).thenReturn(new Type[]{mock(Type.class)});
		Assertions.assertNull(customizer.getGenericType(parameterizedTypes));

		var parameterizedTypesClass = mock(ParameterizedType.class);
		when(parameterizedTypesClass.getActualTypeArguments()).thenReturn(new Type[]{String.class});
		Assertions.assertEquals(String.class, customizer.getGenericType(parameterizedTypesClass));
	}


	@Test
	void completeSchemaDoc() {
		// No schema
		var completedSchemas = new HashSet<String>();
		customizer.completeSchemaDoc(null, null, null, completedSchemas, null);
		Assertions.assertEquals(0, completedSchemas.size());

		// No $ref
		var schema = new Schema<>();
		customizer.completeSchemaDoc(schema, null, null, completedSchemas, null);
		Assertions.assertEquals(0, completedSchemas.size());

		// No class
		schema.$ref("#/components/schemas/SystemRole");
		customizer.completeSchemaDoc(schema, null, null, completedSchemas, null);
		Assertions.assertEquals(0, completedSchemas.size());

		// Non ligoj package
		customizer.completeSchemaDoc(schema, String.class, null, completedSchemas, null);
		Assertions.assertEquals(0, completedSchemas.size());

		// Undefined schema
		final var schemas = new HashMap<String, Schema<?>>();
		customizer.completeSchemaDoc(schema, SystemRole.class, SystemUser.class, completedSchemas, schemas);
		Assertions.assertEquals(1, completedSchemas.size());
		Assertions.assertEquals(0, schemas.size());
		Assertions.assertTrue(completedSchemas.contains("#/components/schemas/SystemRole"));

		// Nominal behavior
		schema.$ref("#/components/schemas/SystemUser");
		var lastConnectionSchema = new StringSchema();
		var loginSchema = new StringSchema();
		var systemRoleAssignmentArraySchema = new ArraySchema();
		var systemRoleAssignmentSchema = new Schema<>().$ref("#/components/schemas/SystemRoleAssignment");
		systemRoleAssignmentArraySchema.setItems(systemRoleAssignmentSchema);
		@SuppressWarnings("unchecked") var systemUserSchema = new Schema<>().$ref("#/components/schemas/SystemUser").properties(Map.of("login", loginSchema, "lastConnection", lastConnectionSchema, "roles", systemRoleAssignmentArraySchema));

		schemas.put("SystemUser",systemUserSchema);
		customizer.completeSchemaDoc(schema, SystemUser.class, SystemUser.class, completedSchemas, schemas);
		Assertions.assertEquals(3, completedSchemas.size());
		Assertions.assertTrue(completedSchemas.contains("#/components/schemas/SystemUser"));
		Assertions.assertTrue(completedSchemas.contains("#/components/schemas/SystemRoleAssignment"));
		customizer.completeSchemaDoc(schema, SystemUser.class, SystemUser.class, completedSchemas, schemas);
		Assertions.assertEquals(3, completedSchemas.size());

	}

}
