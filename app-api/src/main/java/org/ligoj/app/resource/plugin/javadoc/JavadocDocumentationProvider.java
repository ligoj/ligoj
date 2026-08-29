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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

	private static final Pattern PRE_PATTERN = Pattern.compile("<pre[^>]*>(?:\\s*<code[^>]*>)?(.*?)(?:</code>\\s*)?</pre>", Pattern.DOTALL);
	private static final Pattern NUMERIC_ENTITY_PATTERN = Pattern.compile("&#(\\d+);");

	private static final Pattern FENCE_PATTERN = Pattern.compile("```\n.*?\n```", Pattern.DOTALL);

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
			// Scan on RAW extracts so the index arithmetic matches the source string
			var parameterInfo = getJavaDocText(paramString, MARKUP_OPERATION_PARAM, MARKUP_HEADER_START, codeIndex, MARKUP_OPERATION_PARAM_END, true);
			while (parameterInfo != null) {
				paramDocs.add(normalize(parameterInfo, false).split("- ")[1].trim());
				codeIndex += parameterInfo.length();
				parameterInfo = getJavaDocText(paramString, MARKUP_OPERATION_PARAM, MARKUP_HEADER_START, codeIndex, MARKUP_OPERATION_PARAM_END, true);
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
				// Plain text target (operation summary): tags out, entities decoded
				niceDoc = decodeEntities(niceDoc.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim());
			} else {
				niceDoc = htmlToMarkdown(niceDoc);
			}
		}
		return niceDoc;
	}

	/**
	 * Convert the small HTML subset the standard doclet emits into Markdown, the format Swagger UI renders for
	 * OpenAPI {@code description} fields. Idempotent on already-converted text, since some descriptions are
	 * normalized twice along the customizer paths.
	 *
	 * @param html The Javadoc HTML fragment.
	 * @return The Markdown equivalent.
	 */
	protected static String htmlToMarkdown(String html) {
		// 1. Shelter <pre>/<pre><code> blocks (fenced on restore) and already-converted markdown fences —
		// some customizer paths normalize twice. The control-char sentinel cannot appear in doclet output.
		final var preBlocks = new LinkedList<String>();
		var md = PRE_PATTERN.matcher(html).replaceAll(m -> {
			preBlocks.add("```\n" + decodeEntities(m.group(1).strip()) + "\n```");
			return Matcher.quoteReplacement("\u0001" + (preBlocks.size() - 1) + "\u0001");
		});
		md = FENCE_PATTERN.matcher(md).replaceAll(m -> {
			preBlocks.add(m.group());
			return Matcher.quoteReplacement("\u0001" + (preBlocks.size() - 1) + "\u0001");
		});

		// 2. Structural and inline tags
		md = md.replace("\r", "").replaceAll("[ \\t]+", " ")
				// Absolute links become Markdown links, relative ones (javadoc site) keep the text only
				.replaceAll("<a href=\"(https?://[^\"]+)\"[^>]*>((?!</a>).*?)</a>", "[$2]($1)")
				.replaceAll("<a href=[^>]*>((?!</a>).*?)</a>", "$1")
				.replaceAll("</?p[^>]*>", "\n\n")
				// Backslash hard break: survives trailing-whitespace trimming, unlike the two-space form
				.replaceAll("<br[^>]*>", "\\\\\n")
				.replaceAll("<li[^>]*>", "\n- ")
				.replaceAll("</?[uo]l[^>]*>", "\n")
				.replaceAll("</?(code|tt)>", "`")
				.replaceAll("</?(b|strong)>", "**")
				.replaceAll("</?(i|em)>", "*")
				// Anything else (span, div, h*, dl, ...) is dropped
				.replaceAll("</?[a-zA-Z][^>]*>", "");

		// 3. Entities, then whitespace cosmetics: source-code line wraps (single newlines) are
		// HTML-insignificant and joined back into spaces; only structural newlines remain — paragraph
		// blank lines, tight list items and hard breaks. A hard break butting a blank line (e.g. `<br>`
		// followed by a source newline) would render as a literal backslash — the paragraph break wins.
		md = decodeEntities(md)
				.replaceAll(" ?\n ?", "\n")
				.replaceAll("(?<![\n\\\\])\n(?!\n|- )", " ")
				.replaceAll("\\\\\n(?=\n)", "\n")
				.replaceAll("\n+(?=- )", "\n")
				// Blank line before the list start (safest across MD engines), tight items within
				.replaceAll("(?m)^([^\n-].*)\n- ", "$1\n\n- ")
				.replaceAll("\n{3,}", "\n\n");

		// 4. Restore the fenced code blocks, then final boundary cleanup
		for (var i = 0; i < preBlocks.size(); i++) {
			md = md.replace("\u0001" + i + "\u0001", "\n" + preBlocks.get(i) + "\n");
		}
		md = md.replaceAll("\n{3,}", "\n\n").strip();
		return Strings.CS.removeEnd(md, "\\").strip();
	}

	/**
	 * Decode the HTML entities the doclet emits. Applied after tag conversion so an escaped sample like
	 * {@code &lt;br&gt;} is not mistaken for markup.
	 */
	private static String decodeEntities(String text) {
		return NUMERIC_ENTITY_PATTERN.matcher(text
						.replace("&nbsp;", " ")
						.replace("&lt;", "<")
						.replace("&gt;", ">")
						.replace("&quot;", "\"")
						.replace("&apos;", "'")
						.replace("&amp;", "&"))
				.replaceAll(m -> Matcher.quoteReplacement(
						String.valueOf((char) Integer.parseInt(m.group(1)))));
	}

	/**
	 * Remove useless chars from documentation lines.
	 */
	protected static String removeUselessChars(String doc) {
		return StringUtils.trim(Strings.CS.removeEnd(StringUtils.trim(doc), "."));
	}

	protected String getJavaDocText(String classDoc, String signatureNoClass) {
		// RAW extraction: the operation section keeps its HTML markers for parseMethodDoc
		var operDoc = getJavaDocText(classDoc, MARKUP_OPERATION1 + signatureNoClass, "<__>", 0, MARKUP_OPERATION_END, true);
		if (operDoc == null) {
			operDoc = getJavaDocText(classDoc, MARKUP_OPERATION2 + signatureNoClass, "<__>", 0, MARKUP_OPERATION_END, true);
		}
		return operDoc;
	}

	private String getJavaDocText(String doc, String tag, String notAfterTag, int index, String subNext) {
		return getJavaDocText(doc, tag, notAfterTag, index, subNext, false);
	}

	private String getJavaDocText(String doc, String tag, String notAfterTag, int index, String subNext, boolean raw) {
		var tagIndex = doc.indexOf(tag, index);
		if (tagIndex != -1) {
			var notAfterIndex = doc.indexOf(notAfterTag, index);
			if (notAfterIndex == -1 || notAfterIndex > tagIndex) {
				var nextIndex = doc.indexOf(subNext, tagIndex + tag.length());
				if (nextIndex != -1) {
					final var extract = doc.substring(tagIndex + tag.length(), nextIndex);
					return raw ? extract : normalize(extract, false);
				}
			}
		}
		return null;
	}
}
