package org.ligoj.app.model;

import javax.persistence.Entity;
import javax.persistence.Table;

import org.ligoj.bootstrap.core.model.AbstractBusinessEntity;
import lombok.Getter;
import lombok.Setter;

/**
 * A simple entity holding the last read message by a user. Identifier is the login.
 */
@Getter
@Setter
@Entity
@Table(name = "LIGOJ_MESSAGE_USER_READ")
public class MessageRead extends AbstractBusinessEntity<String> {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Identifier of the last read message. It's not a foreign key to allow message deletion without updating this
	 * value.
	 */
	private int messageId;
}
