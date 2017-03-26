package org.ligoj.app.model;

import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.NotBlank;

import org.ligoj.bootstrap.core.model.AbstractAudited;
import lombok.Getter;
import lombok.Setter;

/**
 * A message to target audience.
 */
@Getter
@Setter
@Entity
@Table(name = "LIGOJ_MESSAGE")
public class Message extends AbstractAudited<Integer> {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Type of target (group, user, ...). When <code>null</code> the target is everybody.
	 * 
	 * @see MessageTargetType
	 */
	@Enumerated(EnumType.STRING)
	@NotNull
	private MessageTargetType targetType;

	/**
	 * Optional related target : user, group, node, ...
	 */
	@NotNull
	private String target;

	/**
	 * Value of the message.
	 */
	@Length(max = 500)
	@NotNull
	@NotBlank
	private String value;
}
