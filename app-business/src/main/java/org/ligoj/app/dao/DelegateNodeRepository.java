package org.ligoj.app.dao;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import org.ligoj.bootstrap.core.dao.RestRepository;
import org.ligoj.app.dao.ldap.DelegateLdapRepository;
import org.ligoj.app.model.DelegateNode;

/**
 * {@link DelegateNode} repository
 */
public interface DelegateNodeRepository extends RestRepository<DelegateNode, Integer> {

	/**
	 * A visible {@link DelegateNode} with possible extension for constraint.
	 */
	String VISIBLE_DELEGATE_PART = "EXISTS (SELECT id FROM DelegateNode dz WHERE (d.name LIKE CONCAT(name, ':%') OR d.name  = name) " + " AND "
			+ DelegateLdapRepository.ASSIGNED_DELEGATE;

	/**
	 * A visible {@link DelegateNode}
	 */
	String VISIBLE_DELEGATE = VISIBLE_DELEGATE_PART + ")";

	/**
	 * Return all {@link DelegateNode} objects regarding the given criteria.
	 * 
	 * @param user
	 *            The user requesting the objects.
	 * @param criteria
	 *            Optional, use to match by LDAP object name or target user.
	 * @param page
	 *            the pagination.
	 * @return all {@link DelegateNode} objects with the given name. Insensitive case search is used.
	 */
	@Query("SELECT d FROM DelegateNode d WHERE (:criteria IS NULL                                                           "
			+ "       OR (UPPER(d.receiver) LIKE UPPER(CONCAT(CONCAT('%',:criteria),'%'))"
			+ "           OR UPPER(d.name) LIKE UPPER(CONCAT(CONCAT('%',:criteria),'%'))))" + " AND " + VISIBLE_DELEGATE)
	Page<DelegateNode> findAll(String user, String criteria, Pageable page);

	/**
	 * Return a positive number if the given node can be updated or created by the given user. A node can be managed
	 * when it is visible and it exists at least one delegation with administration right for this node or one its
	 * parent.
	 * 
	 * @param user
	 *            The user name requesting to manage a node.
	 * @param node
	 *            The related node to manage.
	 * @param write
	 *            The <code>write</code> flag of the new delegate.
	 * @return A positive number if the given node can be managed by the given user.
	 */
	@Query("SELECT COUNT(id) FROM DelegateNode WHERE canAdmin = true AND (canWrite = true OR :write = false)"
			+ " AND (:node LIKE CONCAT(name, ':%') OR name  = :node) AND " + DelegateLdapRepository.ASSIGNED_DELEGATE)
	int manageNode(String user, String node, boolean write);

	/**
	 * Return a positive amount if the given entity has been deleted by the given user. A delegate can be deleted
	 * when it is visible and it exists at least one delegation with administration right for this node or one its
	 * parent.
	 * 
	 * @param id
	 *            The identifier of object to delete.
	 * @param user
	 *            The user name requesting to manage a node.
	 * @return A positive number if the given delegate has been deleted.
	 */
	@Query("DELETE DelegateNode d WHERE d.id = :id AND " + VISIBLE_DELEGATE_PART + " AND dz.canAdmin = true)")
	@Modifying
	int delete(int id, String user);

}
