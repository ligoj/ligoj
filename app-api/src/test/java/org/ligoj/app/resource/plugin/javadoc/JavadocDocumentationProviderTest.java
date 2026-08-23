/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.reflect.MethodUtils;
import org.apache.cxf.jaxrs.model.ClassResourceInfo;
import org.apache.cxf.jaxrs.model.MethodDispatcher;
import org.apache.cxf.jaxrs.model.OperationResourceInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.ligoj.app.resource.plugin.SampleTool1;
import org.ligoj.app.resource.plugin.SampleTool2;
import org.ligoj.app.resource.plugin.SampleTool4;
import org.ligoj.bootstrap.model.system.SystemUser;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;

/**
 * Test class of {@link JavadocDocumentationProvider}.
 */
class JavadocDocumentationProviderTest extends AbstractJavaDocTest {

	private JavadocDocumentationProvider provider;

	@BeforeEach
	void configureProvider() throws IOException {
		final var javadocUrls = newJavadocUrls();
		provider = new JavadocDocumentationProvider(new URLClassLoader(javadocUrls.toArray(new URL[0])));
	}

	@Test
	void getClassDoc() {
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		cri1.setMethodDispatcher(new MethodDispatcher());
		Assertions.assertEquals("Sample tool for test", provider.getClassDoc(cri1));
	}

	@Test
	void getClassDocSuper() {
		final var cri1 = new ClassResourceInfo(SampleTool2.class);
		cri1.setMethodDispatcher(new MethodDispatcher());
		Assertions.assertEquals("Sample tool for test", provider.getClassDoc(cri1));
	}

	@Test
	void getClassDocInterfaces() {
		final var cri1 = new ClassResourceInfo(SampleTool4.class);
		cri1.setMethodDispatcher(new MethodDispatcher());
		Assertions.assertNull(provider.getClassDoc(cri1));
	}

	@Test
	void getClassDocNoDoc() {
		final var cri1 = new ClassResourceInfo(String.class);
		Assertions.assertNull(provider.getClassDoc(cri1));
	}

	@Test
	void getClassDocError() {
		Assertions.assertNull(provider.getClassDoc((Class<?>)null));
	}

	@Test
	void getMethodDoc() {
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class), cri1);
		Assertions.assertEquals("Method doc. Details", provider.getMethodDoc(ori1));
	}


	@Test
	void getMethodDocFromString() {
		var mDoc = provider.parseMethodDoc("""
				<section class="method-details" id="method-detail">
				<section class="detail" id="test1(java.lang.String,org.ligoj.bootstrap.model.system.SystemUser)">
				<div class="block">Method doc. Details.</div>
				<dl class="notes">
				<dt>Parameters:</dt>
				<dd><code>param1</code> - Param1 doc.</dd>
				<dd><code>user</code> - User doc. Details.</dd>
				<dt>Returns:</dt>
				<dd>Return doc</dd>
				</dl>
				</section>
				""");
		Assertions.assertEquals("Method doc. Details", mDoc.getMethodInfo());
		Assertions.assertEquals("Param1 doc", mDoc.getParamInfo().getFirst());
		Assertions.assertEquals("Return doc", mDoc.getReturnInfo());
	}

	@Test
	void getMethodDocFromStringNoReturn() {
		var mDoc = provider.parseMethodDoc("""
				<section class="method-details" id="method-detail">
				<section class="detail" id="test1(java.lang.String,org.ligoj.bootstrap.model.system.SystemUser)">
				<div class="block">Method doc. Details.</div>
				<dl class="notes">
				<dt>Parameters:</dt>
				<dd><code>param1</code> - Param1 doc.</dd>
				<dd><code>user</code> - User doc. Details.</dd>
				</dl>
				</section>
				""");
		Assertions.assertEquals("Method doc. Details", mDoc.getMethodInfo());
		Assertions.assertEquals("Param1 doc", mDoc.getParamInfo().getFirst());
		Assertions.assertNull(mDoc.getReturnInfo());
	}

	@Test
	void getMethodDocFromStringNoParams() {
		var mDoc = provider.parseMethodDoc("""
				<section class="method-details" id="method-detail">
				<section class="detail" id="test1(java.lang.String,org.ligoj.bootstrap.model.system.SystemUser)">
				<div class="block">Method doc. Details.</div>
				<dl class="notes">
				</dl>
				</section>
				""");
		Assertions.assertEquals("Method doc. Details", mDoc.getMethodInfo());
		Assertions.assertTrue(mDoc.getParamInfo().isEmpty());
		Assertions.assertNull(mDoc.getReturnInfo());
	}

	@Test
	void getMethodDocFromStringUndefined() {
		var mDoc = provider.parseMethodDoc("""
				<section class="method-details" id="method-detail">
				<section class="detail" id="test1(java.lang.String,org.ligoj.bootstrap.model.system.SystemUser)">
				</section>
				""");
		Assertions.assertNull(mDoc.getMethodInfo());
	}


	@Test
	void getMethodDocFromStringInvalidMarkup() {
		var mDoc = provider.parseMethodDoc("""
				<section class="method-details" id="method-detail">
				<section class="detail" id="test1(java.lang.String,org.ligoj.bootstrap.model.system.SystemUser)">
				<div class="block">Method doc. Details.
				<dl class="notes">
				</dl>
				</section>
				""");
		Assertions.assertNull(mDoc.getMethodInfo());
	}

	@Test
	void getMethodNoDoc() {
		final var cri1 = new ClassResourceInfo(String.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(String.class, "toString"), cri1);
		Assertions.assertNull(provider.getMethodDoc(ori1));
	}

	@Test
	void getMethodDocError() {
		Assertions.assertNull(provider.getMethodDoc((Method)null));
	}


	@Test
	void getMethodResponseDoc() {
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class), cri1);
		Assertions.assertEquals("Return doc", provider.getMethodResponseDoc(ori1));
	}


	@Test
	void getMethodResponseNoDoc() {
		final var cri1 = new ClassResourceInfo(String.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(String.class, "toString"), cri1);
		Assertions.assertNull(provider.getMethodResponseDoc(ori1));
	}

	@Test
	void getMethodResponseDocError() {
		Assertions.assertNull(provider.getMethodResponseDoc(null));
	}


	@Test
	void getMethodParameterDoc() {
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class), cri1);
		Assertions.assertEquals("Param1 doc", provider.getMethodParameterDoc(ori1, 0));
		Assertions.assertEquals("User doc. Details", provider.getMethodParameterDoc(ori1, 1));
		Assertions.assertNull(provider.getMethodParameterDoc(ori1, 2));
	}


	@Test
	void getMethodParameterNoDoc() {
		final var cri1 = new ClassResourceInfo(String.class);
		final var ori1 = new OperationResourceInfo(MethodUtils.getMatchingMethod(String.class, "getBytes"), cri1);
		Assertions.assertNull(provider.getMethodParameterDoc(ori1, 0));
	}

	@Test
	void getMethodParameterDocError() {
		Assertions.assertNull(provider.getMethodParameterDoc(null, 0));
	}

	@Test
	void getMethodDocResourceError() {
		// A loader failure while reading the javadoc resource is swallowed → null
		final var throwingProvider = new JavadocDocumentationProvider(new URLClassLoader(new URL[0]) {
			@Override
			public java.io.InputStream getResourceAsStream(final String name) {
				throw new IllegalStateException();
			}
		});
		final var method = MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class);
		Assertions.assertNull(throwingProvider.getMethodDoc(method));
	}

	@Test
	void getClassDocLigojClassWithoutPath() {
		// An org.ligoj.* class without @Path anywhere in its hierarchy is looked up
		// by its own name; no javadoc resource exists for this test class → null
		Assertions.assertNull(provider.getClassDoc(JavadocDocumentationProviderTest.class));
	}

	@Test
	void getMethodDocToInvoke() {
		// Without an annotated method, the fallback is the method to invoke
		final var cri1 = new ClassResourceInfo(SampleTool1.class);
		final var method = MethodUtils.getMatchingMethod(SampleTool1.class, "test1", String.class, SystemUser.class);
		final var ori1 = new OperationResourceInfo(method, cri1) {
			@Override
			public Method getAnnotatedMethod() {
				return null;
			}
		};
		Assertions.assertEquals("Method doc. Details", provider.getMethodDoc(ori1));
	}

	@Test
	void getJavaDocTextAlternateMarkup() {
		// Older javadoc layout: operations under '<h3 id="...">' instead of
		// '<section class="detail" id="...">' — the fallback markup must match.
		// The matched tag ends at the opening quote, so the extraction keeps the
		// remainder of the h3 attribute markup ('">') as-is.
		Assertions.assertEquals("\">Alt doc",
				provider.getJavaDocText("<h3 id=\"test1()\">Alt doc.</section>", "test1()"));
	}

	@Test
	void normalize() {
		Assertions.assertEquals("Test", JavadocDocumentationProvider.normalize("Test", false));
		Assertions.assertEquals("Test sample", JavadocDocumentationProvider.normalize("   test sample . ", false));
		Assertions.assertEquals("", JavadocDocumentationProvider.normalize(" ", false));
		Assertions.assertNull(JavadocDocumentationProvider.normalize(null, false));
		Assertions.assertEquals("", JavadocDocumentationProvider.normalize(".", false));
		Assertions.assertEquals("Pre <code>Hello</code> World post", JavadocDocumentationProvider.normalize("pre <a href=\"..\"><code>Hello</code> World</a> post", false));
		Assertions.assertEquals("Pre Hello World post", JavadocDocumentationProvider.normalize("pre <a href=\"..\"><code>Hello</code> World</a> post", true));
	}

	@Test
	void removeUselessChars() {
		Assertions.assertEquals("Test", JavadocDocumentationProvider.removeUselessChars("Test"));
		Assertions.assertEquals("test", JavadocDocumentationProvider.removeUselessChars("   test . "));
		Assertions.assertEquals("", JavadocDocumentationProvider.removeUselessChars(" "));
		Assertions.assertNull(JavadocDocumentationProvider.removeUselessChars(null));
		Assertions.assertEquals("", JavadocDocumentationProvider.removeUselessChars("."));
	}

	@Test
	void adClassDocNoFoundMarker() throws IOException {
		Assertions.assertNull(provider.adClassDoc(String.class, new ByteArrayInputStream("".getBytes()), String.class.getName()));
	}

	@Test
	void adClassDoc() throws IOException {
		Assertions.assertEquals("CONTENT1", provider.adClassDoc(String.class, IOUtils.toInputStream(String.class.getName() + "<div class=\"block\">CONTENT1</div>Method Summary<div></div>", StandardCharsets.UTF_8), String.class.getName()).getClassInfo());
		Assertions.assertEquals("CONTENT2", provider.adClassDoc(String.class, IOUtils.toInputStream(String.class.getName() + "<div class=\"block\">CONTENT2</div>", StandardCharsets.UTF_8), String.class.getName()).getClassInfo());
	}
}
