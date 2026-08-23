/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.javadoc;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Javadoc's class structure.
 */
@AllArgsConstructor
class ClassDocs {

	@Getter
	private final String classDoc;

	@Getter
	private final String classInfo;

	private final Map<Method, MethodDocs> methodDocs = new ConcurrentHashMap<>();

	/**
	 * Return method documentation block.
	 *
	 * @param method The requested Java {@link Method}.
	 * @return Method documentation block.
	 */
	public MethodDocs getMethodDocs(final Method method) {
		return methodDocs.get(method);
	}

	/**
	 * Associate documentation block to given {@link Method}.
	 *
	 * @param method The related Java method.
	 * @param doc    The documentation to associated.
	 */
	public void addMethodDocs(final Method method, final MethodDocs doc) {
		methodDocs.putIfAbsent(method, doc);
	}
}