package org.ligoj.app.resource.schedule;

import java.time.Instant;

import lombok.Getter;
import lombok.Setter;

/**
 * A scheduled task of the application: a Spring {@code @Scheduled} method, or a schedule contributed by a
 * {@link ScheduledTaskProvider}.
 */
@Getter
@Setter
public class ScheduledTaskVo {

	/**
	 * Stable identifier, such as <code>spring:org.ligoj.app.resource.node.NodeResource#checkNodesStatusScheduler</code>.
	 */
	private String id;

	/**
	 * Origin: <code>spring</code> for the annotated methods, otherwise the provider's name.
	 */
	private String source;

	/**
	 * Simple name of the bean class.
	 */
	private String bean;

	/**
	 * Fully qualified name of the bean class.
	 */
	private String beanClass;

	/**
	 * Executed method.
	 */
	private String method;

	/**
	 * Trigger kind: <code>cron</code>, <code>fixed-rate</code>, <code>fixed-delay</code>, <code>trigger</code>.
	 */
	private String trigger;

	/**
	 * Trigger expression: the cron expression (Spring format), or the ISO-8601 interval of the fixed triggers.
	 */
	private String expression;

	/**
	 * Schedule state: <code>scheduled</code>, <code>disabled</code>, <code>running</code>.
	 */
	private String status;

	/**
	 * Next execution, <code>null</code> when disabled or unknown.
	 */
	private Instant nextExecution;

	/**
	 * Last execution, <code>null</code> when never executed since the start (Spring tracks the annotated methods
	 * in memory, the providers track their own jobs).
	 */
	private Instant lastExecution;

	/**
	 * Result of the last execution: <code>succeeded</code>, <code>failed</code>, <code>null</code> when never
	 * executed or still running.
	 */
	private String lastStatus;

	/**
	 * Error of the last execution when it failed.
	 */
	private String lastError;
}
