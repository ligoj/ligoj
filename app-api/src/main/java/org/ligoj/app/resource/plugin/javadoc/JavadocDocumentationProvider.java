/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.apache.cxf.helpers.IOUtils;
import org.apache.cxf.jaxrs.model.ClassResourceInfo;
import org.apache.cxf.jaxrs.model.OperationResourceInfo;
import org.apache.cxf.jaxrs.model.doc.DocumentationProvider;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.net.URLClassLoader;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Extract JavaDoc from provider jar URLs.
 */
public class JavadocDocumentationProvider implements DocumentationProvider {
	private static final String MARKUP_OPERATION1 = "<section class=\"detail\" id=\"";
	private static final String MARKUP_OPERATION2 = "<h3 id=\"";
	private static final String MARKUP_OPERATION_END = "</section>";
	private static final String MARKUP_PARAMETER = "<dt>Parameters:</dt>";
	private static final String MARKUP_RETURN = "<dt>Returns:</dt>";
	private static final String MARKUP_HEADER_START = "<dt>";
	private static final String MARKUP_BLOCK = "<div class=\"block\">";
	private static final String MARKUP_BLOCK_END = "</div>";
	private static final String MARKUP_OPERATION_PARAM = "<dd>";
	private static final String MARKUP_OPERATION_PARAM_END = "</dd>";

	private final ConcurrentHashMap<String, ClassDocs> docs = new ConcurrentHashMap<>();

	private final URLClassLoader javaDocLoader;

	JavadocDocumentationProvider(URLClassLoader javaDocLoader) {
		this.javaDocLoader = javaDocLoader;
	}

	@Override
	public String getClassDoc(final ClassResourceInfo cri) {
		return getClassDoc(cri.getServiceClass());
	}

	/**
	 * Return class documentation from a class.
	 *
	 * @param clazz The class to load.
	 * @return class documentation or null.
	 */
	String getClassDoc(final Class<?> clazz) {
		try {
			var doc = getClassDocInternal(clazz);
			if (doc == null) {
				return null;
			}
			return doc.getClassInfo();
		} catch (Exception _) {
			// ignore
		}
		return null;
	}

	@Override
	public String getMethodDoc(OperationResourceInfo ori) {
		return getMethodDoc(getApiMethod(ori));
	}

	String getMethodDoc(Method method) {
		var doc = getMethodDocs(method);
		if (doc == null) {
			return null;
		}
		return doc.getMethodInfo();
	}

	@Override
	public String getMethodResponseDoc(OperationResourceInfo ori) {
		var doc = getMethodDocs(getApiMethod(ori));
		if (doc == null) {
			return null;
		}
		return doc.getReturnInfo();
	}

	@Override
	public String getMethodParameterDoc(OperationResourceInfo ori, int paramIndex) {
		var doc = getMethodDocs(getApiMethod(ori));
		if (doc == null) {
			return null;
		}
		var params = doc.getParamInfo();
		if (paramIndex < params.size()) {
			return params.get(paramIndex);
		}
		return null;
	}

	private MethodDocs getMethodDocs(Method method) {
		if (method == null) {
			return null;
		}
		try {
			return getOperationDocInternal(method);
		} catch (Exception _) {
			// ignore
		}
		return null;
	}

	/**
	 * Return the first class annotated Path within the given class hierarchy.
	 */
	private Class<?> getPathAnnotatedClass(Class<?> cls) {
		Class<?> result = null;
		if (cls.getAnnotation(jakarta.ws.rs.Path.class) != null) {
			result = cls;
		} else {
			if (cls.getSuperclass() != null) {
				result = getPathAnnotatedClass(cls.getSuperclass());
			}
			if (result == null) {
				result = Arrays.stream(cls.getInterfaces()).map(this::getPathAnnotatedClass).filter(Objects::nonNull).findFirst().orElse(null);
			}
		}
		return result;
	}

	ClassDocs getClassDocInternal(Class<?> cls) throws IOException {
		var annotatedClass = getPathAnnotatedClass(cls);
		if (annotatedClass == null) {
			if (!cls.getName().startsWith("org.ligoj.")) {
				return null;
			}
			annotatedClass = cls;
		}
		final var resource = annotatedClass.getName().replace(".", "/") + ".html";
		var classDocs = docs.get(resource);
		if (classDocs == null) {
			// Not yet cached
			var resourceStream = javaDocLoader.getResourceAsStream(resource);
			if (resourceStream != null) {
				classDocs = adClassDoc(annotatedClass, resourceStream, resource);
			}
		}
		return classDocs;
	}

	ClassDocs adClassDoc(Class<?> cls, InputStream htmlStream, String resource) throws IOException {
		final var doc = IOUtils.readStringFromStream(htmlStream);
		final var classMarker = cls.getSimpleName();
		int index = doc.indexOf(classMarker);
		ClassDocs result = null;
		if (index != -1) {
			var classInfo = getJavaDocText(doc, MARKUP_BLOCK, "Method Summary", index + classMarker.length(), MARKUP_BLOCK_END);
			result = new ClassDocs(doc, classInfo);
			docs.putIfAbsent(resource, result);
		}
		return result;
	}

	MethodDocs parseMethodDoc(String operDoc) {
		var operInfo = getJavaDocText(operDoc, MARKUP_BLOCK, MARKUP_OPERATION_END, 0, MARKUP_BLOCK_END);
		String responseInfo = null;
		var paramDocs = new LinkedList<String>();
		var returnsIndex = operDoc.indexOf(MARKUP_RETURN);
		if (returnsIndex != -1) {
			responseInfo = getJavaDocText(operDoc, MARKUP_OPERATION_PARAM, "<__>", returnsIndex + 8, MARKUP_OPERATION_PARAM_END);
		}
		var paramIndex = operDoc.indexOf(MARKUP_PARAMETER);
		if (paramIndex != -1) {
			var paramString = operDoc.substring(paramIndex + MARKUP_PARAMETER.length(), Math.max(returnsIndex, operDoc.length()));
			var codeIndex = 0;
			var parameterInfo = getJavaDocText(paramString, MARKUP_OPERATION_PARAM, MARKUP_HEADER_START, codeIndex, MARKUP_OPERATION_PARAM_END);
			while (parameterInfo != null) {
				paramDocs.add(parameterInfo.split("- ")[1].trim());
				codeIndex += parameterInfo.length();
				parameterInfo = getJavaDocText(paramString, MARKUP_OPERATION_PARAM, MARKUP_HEADER_START, codeIndex, MARKUP_OPERATION_PARAM_END);
			}
		}
		return new MethodDocs(operInfo, paramDocs, responseInfo);
	}

	private Method getApiMethod(OperationResourceInfo ori) {
		if (ori == null) {
			return null;
		}
		return ori.getAnnotatedMethod() == null ? ori.getMethodToInvoke() : ori.getAnnotatedMethod();
	}

	private MethodDocs getOperationDocInternal(Method method) throws Exception {
		final var classDoc = getClassDocInternal(method.getDeclaringClass());
		if (classDoc == null) {
			return null;
		}
		var signatureNoClass = StringUtils.substringBefore(StringUtils.substringAfter(method.toString(), method.getDeclaringClass().getName()).substring(1), " ");
		var mDocs = classDoc.getMethodDocs(method);
		if (mDocs == null) {
			// Not yet cached
			var operDoc = getJavaDocText(classDoc.getClassDoc(), signatureNoClass);
			mDocs = parseMethodDoc(operDoc);
			classDoc.addMethodDocs(method, mDocs);
		}

		return mDocs;
	}

	protected static String normalize(String doc, boolean removeHtml) {
		var niceDoc = StringUtils.capitalize(removeUselessChars(StringUtils.trim(doc)));
		if (niceDoc != null) {
			if (removeHtml) {
				niceDoc = niceDoc.replaceAll("<[^>]*>", "");
			} else {
				niceDoc = niceDoc.replaceAll("<a href=[^>]*>((?!</a>).*)</a>", "$1");
			}
		}
		return niceDoc;
	}

	/**
	 * Remove useless chars from documentation lines.
	 */
	protected static String removeUselessChars(String doc) {
		return StringUtils.trim(Strings.CS.removeEnd(StringUtils.trim(doc), "."));
	}

	protected String getJavaDocText(String classDoc, String signatureNoClass) {
		var operDoc = getJavaDocText(classDoc, MARKUP_OPERATION1 + signatureNoClass, "<__>", 0, MARKUP_OPERATION_END);
		if (operDoc == null) {
			operDoc = getJavaDocText(classDoc, MARKUP_OPERATION2 + signatureNoClass, "<__>", 0, MARKUP_OPERATION_END);
		}
		return operDoc;
	}

	private String getJavaDocText(String doc, String tag, String notAfterTag, int index, String subNext) {
		var tagIndex = doc.indexOf(tag, index);
		if (tagIndex != -1) {
			var notAfterIndex = doc.indexOf(notAfterTag, index);
			if (notAfterIndex == -1 || notAfterIndex > tagIndex) {
				var nextIndex = doc.indexOf(subNext, tagIndex + tag.length());
				if (nextIndex != -1) {
					return normalize(doc.substring(tagIndex + tag.length(), nextIndex), false);
				}
			}
		}
		return null;
	}
}
