package org.ligoj.app.dao;

import org.ligoj.app.iam.dao.DelegateOrgRepository;
import org.ligoj.app.model.Message;
import org.ligoj.bootstrap.core.dao.RestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * {@link Message} repository
 */
public interface MessageRepository extends RestRepository<Message, Integer> {

	/**
	 * Base query to find related messages of a user.
	 */
	String MY_MESSAGES = "FROM Message m WHERE (targetType IS NULL                           "
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.USER    AND target = :user)"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.GROUP   AND EXISTS(SELECT 1 FROM CacheMembership c WHERE c.user.id = :user AND (c.group.id = m.target"
			+ "       OR EXISTS(SELECT 1 FROM CacheGroup cg WHERE cg.id=m.target AND c.group.description LIKE CONCAT('%,', cg.description)))))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.COMPANY AND EXISTS(SELECT 1 FROM CacheUser c WHERE c.id = :user AND (c.company.id = m.target"
			+ "       OR EXISTS(SELECT 1 FROM CacheCompany cc WHERE cc.id=m.target AND c.company.description LIKE CONCAT('%,', cc.description)))))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.PROJECT AND EXISTS(SELECT 1 FROM Project p   WHERE p.pkey = m.target AND "
			+ ProjectRepository.MY_PROJECTS + "))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.NODE AND EXISTS(SELECT 1    FROM Subscription s INNER JOIN s.project p INNER JOIN s.node n000 WHERE"
			+ "     (n000.id = m.target OR n000.id LIKE CONCAT(m.target, ':%')) AND " + ProjectRepository.MY_PROJECTS + ")))";

	/**
	 * Base query to find messages a user can see, even if there are not targeting him/her. User can also see his/her
	 * messages sent directly to another user.
	 */
	String VISIBLE_MESSAGES = "FROM Message m WHERE (targetType IS NULL                           "
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.USER    AND createdBy = :user)"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.GROUP   AND EXISTS(SELECT 1 FROM CacheGroup c WHERE c.id = m.target"
			+ "       AND EXISTS(SELECT 1 FROM DelegateLdap d WHERE (d.type=org.ligoj.app.model.ldap.DelegateLdapType.TREE OR d.type=org.ligoj.app.model.ldap.DelegateLdapType.GROUP)"
			+ "           AND c.description LIKE CONCAT('%,', d.dn) AND " + DelegateOrgRepository.ASSIGNED_DELEGATE + ")))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.COMPANY AND EXISTS(SELECT 1 FROM CacheCompany c WHERE c.id = m.target"
			+ "       AND EXISTS(SELECT 1 FROM DelegateLdap d WHERE (d.type=org.ligoj.app.model.ldap.DelegateLdapType.TREE OR d.type=org.ligoj.app.model.ldap.DelegateLdapType.COMPANY)"
			+ "           AND c.description LIKE CONCAT('%,', d.dn) AND " + DelegateOrgRepository.ASSIGNED_DELEGATE + ")))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.PROJECT AND EXISTS(SELECT 1 FROM Project p   WHERE p.pkey = m.target AND "
			+ ProjectRepository.VISIBLE_PROJECTS + "))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.NODE AND EXISTS(SELECT 1    FROM Node n WHERE n.id = m.target"
			+ "       AND EXISTS(SELECT 1 FROM DelegateNode d WHERE " + DelegateOrgRepository.ASSIGNED_DELEGATE
			+ " AND (n.id LIKE CONCAT(d.name, ':%') OR n.id = d.id)))))";

	/**
	 * Return all messages where the given user is involved and by criteria.
	 * 
	 * @param user
	 *            The user requesting the messages.
	 * @param criteria
	 *            Optional text to filter the messages.
	 * @return The related messages
	 */
	@Query(MY_MESSAGES + " AND (:criteria IS NULL OR targetType LIKE(CONCAT(CONCAT('%',:criteria),'%'))"
			+ "                 OR target LIKE(CONCAT(CONCAT('%',:criteria),'%')) OR value LIKE(CONCAT(CONCAT('%',:criteria),'%')))")
	Page<Message> findMy(String user, String criteria, Pageable page);

	/**
	 * Return all messages the given user could have written, and by criteria. The main difference with the function
	 * {@link #findMy(String, String, Pageable)} is the messages returned includes the one the given user is not
	 * involved, or targeted.
	 * For sample, with this function, a user can see all messages from a group because this group is visible by this
	 * user.
	 * But with the other function {@link #findMy(String, String, Pageable)} these messages will be returned
	 * because this user is not member of this group.
	 * 
	 * @param user
	 *            The user requesting the messages.
	 * @param criteria
	 *            Optional text to filter the messages.
	 * @return The related messages
	 */
	@Query(VISIBLE_MESSAGES + " AND (:criteria IS NULL OR targetType LIKE(CONCAT(CONCAT('%',:criteria),'%'))"
			+ "                 OR target LIKE(CONCAT(CONCAT('%',:criteria),'%')) OR value LIKE(CONCAT(CONCAT('%',:criteria),'%')))")
	Page<Message> findAll(String user, String criteria, Pageable page);

	/**
	 * Return the amount of unread messages since the last time this user has read them.
	 * 
	 * @param user
	 *            The user requesting the counter.
	 * @return the amount of unread messages since the last time this user has read them.
	 */
	@Query("SELECT COUNT(m.id) " + MY_MESSAGES
			+ " AND m.id > (SELECT CASE mr.messageId WHEN NULL THEN 0 ELSE mr.messageId END FROM MessageRead  mr WHERE mr.id = :user)")
	int countUnread(String user);

	/**
	 * Base query to find related project to a user "u.id".
	 */
	String HIS_PROJECTS = "(p.teamLeader = u.id"
			+ " OR EXISTS(SELECT 1 FROM ParameterValue AS pv, CacheGroup g WHERE pv.parameter.id = 'service:id:group' AND pv.subscription.project = p AND g.id = pv.data"
			+ "     AND EXISTS(SELECT 1 FROM CacheMembership AS cm WHERE cm.user.id = u.id AND cm.group = g)))";

	/**
	 * Return the amount of users targeted by the given configuration.
	 * 
	 * @param targetType
	 *            The message type.
	 * @param target
	 *            The target configuration : group, node, ...
	 * @return The amount of users targeted by the given configuration.
	 */
	@Query("SELECT COUNT(u.id) FROM CacheUser u WHERE :targetType IS NULL                           "
			+ "  OR (:targetType = 'USER'     AND :target = u.id)"
			+ "  OR (:targetType = 'GROUP'    AND EXISTS(SELECT 1 FROM CacheMembership c WHERE c.user = u AND (c.group.id = :target"
			+ "       OR EXISTS(SELECT 1 FROM CacheGroup cg WHERE cg.id=:target AND c.group.description LIKE CONCAT('%,', cg.description)))))"
			+ "  OR (:targetType = 'COMPANY'  AND (u.company.id = :target "
			+ "       OR EXISTS(SELECT 1 FROM CacheCompany cc WHERE cc.id=:target AND u.company.description LIKE CONCAT('%,', cc.description))))"
			+ "  OR (:targetType = 'PROJECT'  AND EXISTS(SELECT 1 FROM Project p WHERE p.pkey = :target AND " + HIS_PROJECTS + "))"
			+ "  OR (:targetType = 'NODE'     AND EXISTS(SELECT 1 FROM Subscription s INNER JOIN s.project p INNER JOIN s.node n000 WHERE "
			+ HIS_PROJECTS + "        AND (n000.id = :target OR n000.id LIKE CONCAT(:target, ':%'))))")
	int audience(String targetType, String target);

	/**
	 * Base query to find related messages of a user.
	 */
	String AUDIENCE_MESSAGES = "FROM Message m WHERE (targetType IS NULL                           "
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.USER    AND target = :user)"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.GROUP   AND EXISTS(SELECT 1 FROM CacheMembership c WHERE c.user.id = :user AND (c.group.id = m.target"
			+ "       OR EXISTS(SELECT 1 FROM CacheGroup cg WHERE cg.id=m.target AND c.group.description LIKE CONCAT('%,', cg.description)))))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.COMPANY AND EXISTS(SELECT 1 FROM CacheUser c WHERE c.id = :user AND (c.company.id = m.target"
			+ "       OR EXISTS(SELECT 1 FROM CacheCompany cc WHERE cc.id=m.target AND c.company.description LIKE CONCAT('%,', cc.description)))))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.PROJECT AND EXISTS(SELECT 1 FROM Project p   WHERE p.pkey = m.target AND "
			+ ProjectRepository.MY_PROJECTS + "))"
			+ "  OR (targetType = org.ligoj.app.model.MessageTargetType.NODE AND EXISTS(SELECT 1    FROM Subscription s INNER JOIN s.project p INNER JOIN s.node n000 WHERE"
			+ "     (n000.id = m.target OR n000.id LIKE CONCAT(m.target, ':%')) AND " + ProjectRepository.MY_PROJECTS + ")))";

	/**
	 * Delete the message matching to the given identifier if this message is visible to a specified user.
	 * 
	 * @param id
	 *            The message identifier.
	 * @param user
	 *            The user requesting the deletion.
	 * @return The amount of delete messages. Should be either <code>1</code> either <code>0</code>.
	 */
	@Modifying
	@Query("DELETE " + VISIBLE_MESSAGES + " AND m.id = :id")
	int deleteVisible(int id, String user);
}
