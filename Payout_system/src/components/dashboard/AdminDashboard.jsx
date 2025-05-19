import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, onValue, update } from "firebase/database";
import { db, database } from "../../firebase/config";
import SessionList from "../sessions/SessionList";
import PayoutList from "../payouts/PayoutList";
import SessionForm from "../sessions/SessionForm";
import ChatSection from "../chat/ChatSection";
import { PAYMENT_STATUS } from "../../types/index";
import "./Dashboard.css";
import { createActivityLog } from "../../utils/auditTracker";
import { useLoading } from "../../contexts/LoadingContext";

const formatPayoutChanges = (beforeData, afterData) => {
  const changes = [];

  if (beforeData && afterData) {
    if (beforeData.status !== afterData.status) {
      changes.push(
        `Status changed from ${beforeData.status} to ${afterData.status}`
      );
      if (afterData.paymentMethod) {
        changes.push(`Payment completed via ${afterData.paymentMethod}`);
      }
    }
    if (beforeData.amount !== afterData.amount) {
      changes.push(
        `Amount changed from ₹${beforeData.amount} to ₹${afterData.amount}`
      );
    }
  } else if (afterData && !beforeData) {
    changes.push(`Initial amount: ₹${afterData.amount}`);
    changes.push(`Initial status: ${afterData.status}`);
  }

  return changes.join(", ");
};

const AuditLogsList = ({ searchTerm = "", actionType = "all" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const LOGS_PER_PAGE = 10;

  useEffect(() => {
    setLoading(true);
    // Reset pagination when search changes
    setFirstVisible(null);
    setLastVisible(null);
    setCurrentPage(1);

    try {
      // Use a very simple query to ensure it works
      const auditLogsRef = collection(db, "audit_logs");
      let auditLogsQuery;

      if (actionType !== "all" && searchTerm) {
        auditLogsQuery = query(
          auditLogsRef,
          where("actionType", "==", actionType),
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          limit(LOGS_PER_PAGE + 1)
        );
      } else if (actionType !== "all") {
        auditLogsQuery = query(
          auditLogsRef,
          where("actionType", "==", actionType),
          orderBy("timestamp", "desc"),
          limit(LOGS_PER_PAGE + 1)
        );
      } else if (searchTerm) {
        auditLogsQuery = query(
          auditLogsRef,
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          limit(LOGS_PER_PAGE + 1)
        );
      } else {
        auditLogsQuery = query(
          auditLogsRef,
          orderBy("timestamp", "desc"),
          limit(LOGS_PER_PAGE + 1)
        );
      }

      const unsubscribe = onSnapshot(
        auditLogsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetchedLogs = [];
            snapshot.forEach((doc) => {
              const data = doc.data();

              // Normalize the data format to handle both old and new schemas
              const normalizedLog = {
                id: doc.id,
                // Use both old and new schema field names
                userEmail: data.userEmail || data.email || "Unknown",
                userId: data.userId || data.uid || "Unknown",
                actionType: data.actionType || "Unknown",
                targetEntity: data.targetEntity || data.userRole || "Unknown",
                details: data.details || data.actionDetails || "No details",
                timestamp:
                  data.timestamp || data.createdAt || new Date().getTime(),
                // Include any additional fields
                ...data,
              };

              fetchedLogs.push(normalizedLog);
            });

            // Check if there are more logs
            setHasMore(fetchedLogs.length > LOGS_PER_PAGE);
            // Remove the extra log we fetched to check if there are more
            const logsToDisplay = fetchedLogs.slice(0, LOGS_PER_PAGE);

            setLogs(logsToDisplay);
            if (snapshot.docs.length > 0) {
              setFirstVisible(snapshot.docs[0]);
              setLastVisible(
                snapshot.docs[
                  snapshot.docs.length > LOGS_PER_PAGE
                    ? LOGS_PER_PAGE - 1
                    : snapshot.docs.length - 1
                ]
              );
            }
          } else {
            setLogs([]);
            setHasMore(false);
          }
          setLoading(false);
        },
        (err) => {
          console.error("AuditLogsList: Error fetching audit logs:", err);
          setError("Failed to load audit logs: " + err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("AuditLogsList: Error setting up audit logs query:", err);
      setError("Failed to set up audit logs query: " + err.message);
      setLoading(false);
      return () => {};
    }
  }, [searchTerm, actionType]);

  const loadNextPage = useCallback(async () => {
    if (!lastVisible) return;

    setLoading(true);
    let nextQuery;

    try {
      if (actionType !== "all" && searchTerm) {
        nextQuery = query(
          collection(db, "audit_logs"),
          where("actionType", "==", actionType),
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(LOGS_PER_PAGE + 1)
        );
      } else if (actionType !== "all") {
        nextQuery = query(
          collection(db, "audit_logs"),
          where("actionType", "==", actionType),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(LOGS_PER_PAGE + 1)
        );
      } else if (searchTerm) {
        nextQuery = query(
          collection(db, "audit_logs"),
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(LOGS_PER_PAGE + 1)
        );
      } else {
        nextQuery = query(
          collection(db, "audit_logs"),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(LOGS_PER_PAGE + 1)
        );
      }

      const snapshot = await getDocs(nextQuery);
      if (!snapshot.empty) {
        const fetchedLogs = [];
        snapshot.forEach((doc) => {
          fetchedLogs.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setHasMore(fetchedLogs.length > LOGS_PER_PAGE);
        const logsToDisplay = fetchedLogs.slice(0, LOGS_PER_PAGE);

        setLogs(logsToDisplay);
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(
          snapshot.docs[
            snapshot.docs.length > LOGS_PER_PAGE
              ? LOGS_PER_PAGE - 1
              : snapshot.docs.length - 1
          ]
        );
        setHasPrevious(true);
        setCurrentPage((prevPage) => prevPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading next page:", error);
      setError("Failed to load more logs: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [lastVisible, actionType, searchTerm]);

  const loadPreviousPage = useCallback(async () => {
    if (!firstVisible) return;

    setLoading(true);
    let prevQuery;

    try {
      if (actionType !== "all" && searchTerm) {
        prevQuery = query(
          collection(db, "audit_logs"),
          where("actionType", "==", actionType),
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limitToLast(LOGS_PER_PAGE + 1)
        );
      } else if (actionType !== "all") {
        prevQuery = query(
          collection(db, "audit_logs"),
          where("actionType", "==", actionType),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limitToLast(LOGS_PER_PAGE + 1)
        );
      } else if (searchTerm) {
        prevQuery = query(
          collection(db, "audit_logs"),
          where("userEmail", ">=", searchTerm),
          where("userEmail", "<=", searchTerm + "\uf8ff"),
          orderBy("userEmail"),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limitToLast(LOGS_PER_PAGE + 1)
        );
      } else {
        prevQuery = query(
          collection(db, "audit_logs"),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limitToLast(LOGS_PER_PAGE + 1)
        );
      }

      const snapshot = await getDocs(prevQuery);
      if (!snapshot.empty) {
        const fetchedLogs = [];
        snapshot.forEach((doc) => {
          fetchedLogs.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        const logsToDisplay = fetchedLogs.slice(
          fetchedLogs.length > LOGS_PER_PAGE ? 1 : 0,
          fetchedLogs.length
        );
        setHasPrevious(currentPage > 2);

        setLogs(logsToDisplay);
        setFirstVisible(
          snapshot.docs[fetchedLogs.length > LOGS_PER_PAGE ? 1 : 0]
        );
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setCurrentPage((prevPage) => prevPage - 1);
      } else {
        setHasPrevious(false);
      }
    } catch (error) {
      console.error("Error loading previous page:", error);
      setError("Failed to load previous logs: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [firstVisible, actionType, searchTerm, currentPage]);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "N/A";

    // Handle different timestamp formats
    try {
      let date;

      // Check if timestamp is a Firestore server timestamp
      if (
        timestamp &&
        timestamp.toDate &&
        typeof timestamp.toDate === "function"
      ) {
        date = timestamp.toDate();
      }
      // Check if timestamp is a Firebase timestamp with seconds field
      else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Check if timestamp is a number (milliseconds since epoch)
      else if (typeof timestamp === "number") {
        date = new Date(timestamp);
      }
      // Check if timestamp is already a Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Check if timestamp is an ISO string date
      else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else {
        return "Invalid date";
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format date as a readable string
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return "Error formatting date";
    }
  }, []);

  if (loading && logs.length === 0) {
    return null;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Audit Logs Found</h3>
        <p>
          There are no logs matching your search criteria or no logs have been
          created yet.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div style={{ marginTop: "20px" }}>
            <p>Try creating a test log to verify the system is working:</p>
            <button
              style={{
                padding: "10px",
                backgroundColor: "#4a6da7",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={async () => {
                try {
                  const logId = await createActivityLog({
                    userId: "test-id-" + Date.now(),
                    userEmail: "system-test@" + window.location.hostname,
                    userRole: "admin",
                    actionType: "test_action",
                    actionDetails: "Test log created from empty state",
                    timestamp: new Date(),
                  });
                  alert(`Test log created with ID: ${logId}`);
                } catch (error) {
                  console.error("Error creating test log:", error);
                  alert(`Error creating test log: ${error.message}`);
                }
              }}
            >
              Create Test Log
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="audit-logs-container">
      <div className="audit-logs-table-container">
        <table className="audit-logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className={
                  log.actionType && log.actionType.includes("payout")
                    ? "payout-log"
                    : ""
                }
              >
                <td>{formatDate(log.timestamp)}</td>
                <td>{log.userEmail || log.userId || "Unknown"}</td>
                <td>{log.actionType || "Unknown"}</td>
                <td>{log.targetEntity || "N/A"}</td>
                <td>
                  {log.details ? (
                    <div className="log-details">
                      <p>{log.details}</p>
                      {log.beforeData && log.afterData && (
                        <div className="changes-section">
                          {log.actionType &&
                          log.actionType.includes("payout") ? (
                            <p className="payout-changes">
                              {formatPayoutChanges(
                                log.beforeData,
                                log.afterData
                              )}
                            </p>
                          ) : (
                            <button
                              className="view-changes-btn"
                              onClick={() =>
                                alert(
                                  JSON.stringify(
                                    {
                                      before: log.beforeData,
                                      after: log.afterData,
                                    },
                                    null,
                                    2
                                  )
                                )
                              }
                            >
                              View Changes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    "No details available"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={loadPreviousPage}
          disabled={!hasPrevious || loading}
        >
          Previous
        </button>
        <span className="pagination-info">Page {currentPage}</span>
        <button
          className="pagination-btn"
          onClick={loadNextPage}
          disabled={!hasMore || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pendingQueries, setPendingQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sessions");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({
    option: "all", // "all", "7days", "15days", "30days", "custom"
    startDate: "",
    endDate: "",
  });
  const [payoutDateFilter, setPayoutDateFilter] = useState({
    option: "all", // "all", "7days", "15days", "30days", "custom"
    startDate: "",
    endDate: "",
  });
  const [mentorSearch, setMentorSearch] = useState("");
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Audit logs state
  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [actionTypes, setActionTypes] = useState([]);
  // Add new state for tracking payout changes
  const [payoutChanges, setPayoutChanges] = useState({});
  const { showLoader, hideLoader } = useLoading();

  const handleError = useCallback((error, context) => {
    let errorMessage = "An error occurred. Please try again.";

    if (error.code) {
      switch (error.code) {
        case "permission-denied":
          errorMessage = "You don't have permission to perform this action.";
          break;
        case "not-found":
          errorMessage = "The requested resource was not found.";
          break;
        case "already-exists":
          errorMessage = "This resource already exists.";
          break;
        case "resource-exhausted":
          errorMessage =
            "The operation was cancelled due to resource constraints.";
          break;
        case "failed-precondition":
          errorMessage =
            "The operation was rejected because the system is not in a state required for the operation's execution.";
          break;
        case "aborted":
          errorMessage = "The operation was aborted.";
          break;
        case "out-of-range":
          errorMessage = "The operation was attempted past the valid range.";
          break;
        case "unimplemented":
          errorMessage =
            "The operation is not implemented or not supported/enabled.";
          break;
        case "internal":
          errorMessage = "An internal error occurred.";
          break;
        case "unavailable":
          errorMessage = "The service is currently unavailable.";
          break;
        case "data-loss":
          errorMessage = "Unrecoverable data loss or corruption.";
          break;
        case "unauthenticated":
          errorMessage =
            "The request does not have valid authentication credentials.";
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    setError(`${context}: ${errorMessage}`);
  }, []);

  useEffect(() => {
    // Fetch Sessions (Firestore)
    const sessionsQuery = query(
      collection(db, "sessions"),
      orderBy("date", "desc")
    );

    let unsubscribeSessions = null;
    let unsubscribePayouts = null;
    let unsubscribeQueries = null;

    try {
      unsubscribeSessions = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          try {
            const sessionsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              uiStatus: doc.data().isPaid ? "paid" : "unpaid",
            }));
            setSessions(sessionsData);
            setLoading(false);
            setError(null);
          } catch (error) {
            handleError(error, "Failed to process sessions data");
            setLoading(false);
          }
        },
        (error) => {
          handleError(error, "Failed to load sessions");
          setLoading(false);
        }
      );

      // Fetch Payouts (Firestore) with validation and audit logging
      const payoutsQuery = query(
        collection(db, "payouts"),
        orderBy("createdAt", "desc")
      );

      unsubscribePayouts = onSnapshot(
        payoutsQuery,
        (snapshot) => {
          try {
            const payoutsData = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
              .filter((payout) => {
                const missingFields = [];
                if (!payout.createdAt) missingFields.push("createdAt");
                if (!payout.mentorEmail) missingFields.push("mentorEmail");
                if (!payout.status) missingFields.push("status");
                if (typeof payout.netAmount !== "number")
                  missingFields.push("netAmount");

                if (missingFields.length > 0) {
                  console.warn(
                    `Invalid payout data (ID: ${
                      payout.id
                    }): Missing fields: ${missingFields.join(", ")}`
                  );
                  return false;
                }

                // Track changes for audit logging
                const previousPayout = payoutChanges[payout.id];
                if (previousPayout) {
                  const changes = {};
                  let hasChanges = false;

                  // Check for status changes
                  if (previousPayout.status !== payout.status) {
                    changes.status = {
                      from: previousPayout.status,
                      to: payout.status,
                    };
                    hasChanges = true;
                  }

                  // Check for amount changes
                  if (previousPayout.netAmount !== payout.netAmount) {
                    changes.netAmount = {
                      from: previousPayout.netAmount,
                      to: payout.netAmount,
                    };
                    hasChanges = true;
                  }

                  // Log changes if any were detected
                  if (hasChanges) {
                    createActivityLog({
                      actionType: "update_payout",
                      targetEntity: "payout",
                      targetId: payout.id,
                      userEmail: payout.mentorEmail,
                      details: `Updated payout for ${payout.mentorEmail}`,
                      beforeData: previousPayout,
                      afterData: payout,
                    }).catch((error) => {
                      console.warn("Failed to log payout changes:", error);
                    });
                  }
                }

                // Update the tracked state
                setPayoutChanges((prev) => ({
                  ...prev,
                  [payout.id]: payout,
                }));

                return true;
              });
            setPayouts(payoutsData);
            setError(null);
          } catch (error) {
            handleError(error, "Failed to process payouts data");
          }
        },
        (error) => {
          handleError(error, "Failed to load payouts");
        }
      );

      // Fetch Pending Queries (Realtime Database)
      const queriesRef = ref(database, "pendingQueries");
      unsubscribeQueries = onValue(
        queriesRef,
        (snapshot) => {
          try {
            if (snapshot.exists()) {
              const queriesData = snapshot.val();
              const queriesList = Object.entries(queriesData).map(
                ([id, query]) => ({
                  id,
                  ...query,
                })
              );
              setPendingQueries(queriesList);
            } else {
              setPendingQueries([]);
            }
          } catch (error) {
            handleError(error, "Failed to process pending queries");
          }
        },
        (error) => {
          handleError(error, "Failed to load pending queries");
        }
      );
    } catch (error) {
      handleError(error, "Failed to initialize dashboard");
      setLoading(false);
    }

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribePayouts) unsubscribePayouts();
      if (unsubscribeQueries) unsubscribeQueries();
    };
  }, [handleError]);

  useEffect(() => {
    if (!mentorSearch) {
      setMentors([]);
      return;
    }

    const searchMentors = async () => {
      try {
        setSearchLoading(true);
        const mentorsQuery = query(
          collection(db, "users"),
          where("role", "==", "mentor"),
          where("email", ">=", mentorSearch.toLowerCase()),
          where("email", "<=", mentorSearch.toLowerCase() + "\uf8ff"),
          orderBy("email"),
          limit(5)
        );

        const snapshot = await getDocs(mentorsQuery);
        const mentorsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMentors(mentorsData);
      } catch (error) {
        console.error("Error searching mentors:", error);
        setError("Failed to search mentors: " + error.message);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchMentors, 300);
    return () => clearTimeout(debounceTimeout);
  }, [mentorSearch]);

  // Add effect to fetch available action types for audit log filtering
  useEffect(() => {
    if (activeTab === "auditLogs") {
      const fetchActionTypes = async () => {
        try {
          // Get a snapshot of the audit_logs collection
          const actionsRef = collection(db, "audit_logs");

          // Simple query to get all documents
          const actionsQuery = query(actionsRef, limit(100));
          const snapshot = await getDocs(actionsQuery);

          // Extract unique action types
          const types = new Set();
          snapshot.forEach((doc) => {
            const data = doc.data();

            if (data && data.actionType) {
              types.add(data.actionType);
            }
          });

          // Add default types if not present in data
          const defaultTypes = [
            "login",
            "logout",
            "page_view",
            "create_session",
            "update_session",
            "delete_session",
            "mark_attendance",
            "create_payout",
            "update_payout_status",
          ];
          defaultTypes.forEach((type) => {
            if (!types.has(type)) {
              types.add(type);
            }
          });

          // Update state with sorted action types
          const sortedTypes = Array.from(types).sort();

          setActionTypes(sortedTypes);
        } catch (error) {
          console.error("Error fetching action types for audit logs:", error);
          // Don't set error state here, just log to console
          // We don't want to block the UI due to this secondary feature

          // Use default action types
          const defaultTypes = [
            "login",
            "logout",
            "page_view",
            "create_session",
            "update_session",
            "delete_session",
            "mark_attendance",
            "create_payout",
            "update_payout_status",
          ];

          setActionTypes(defaultTypes);
        }
      };

      fetchActionTypes();
    }
  }, [activeTab]);

  // Apply date filter when date option changes
  useEffect(() => {
    if (dateFilter.option === "7days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      setDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (dateFilter.option === "15days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 15);

      setDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (dateFilter.option === "30days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      setDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (dateFilter.option === "all") {
      setDateFilter((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
      }));
    }
    // For custom, we keep the dates as manually selected
  }, [dateFilter.option]);

  // Apply date filter when payouts date option changes
  useEffect(() => {
    if (payoutDateFilter.option === "7days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      setPayoutDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (payoutDateFilter.option === "15days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 15);

      setPayoutDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (payoutDateFilter.option === "30days") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      setPayoutDateFilter((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    } else if (payoutDateFilter.option === "all") {
      setPayoutDateFilter((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
      }));
    }
    // For custom, we keep the dates as manually selected
  }, [payoutDateFilter.option]);

  // Filter sessions based on date, mentor, and status
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (
        !dateFilter.startDate &&
        !dateFilter.endDate &&
        !selectedMentor &&
        statusFilter === "all"
      )
        return true;

      const sessionDate = new Date(session.date);
      const startDate = dateFilter.startDate
        ? new Date(dateFilter.startDate)
        : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

      const dateMatch =
        (!startDate || sessionDate >= startDate) &&
        (!endDate || sessionDate <= new Date(endDate).setHours(23, 59, 59));

      const mentorMatch =
        !selectedMentor || session.mentorId === selectedMentor.id;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "paid" && session.isPaid) ||
        (statusFilter === "unpaid" && !session.isPaid);

      return dateMatch && mentorMatch && statusMatch;
    });
  }, [sessions, dateFilter, selectedMentor, statusFilter]);

  // Filter payouts based on date
  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      if (!payoutDateFilter.startDate && !payoutDateFilter.endDate) {
        return true;
      }

      const payoutDate = new Date(payout.createdAt);
      const startDate = payoutDateFilter.startDate
        ? new Date(payoutDateFilter.startDate)
        : null;
      const endDate = payoutDateFilter.endDate
        ? new Date(payoutDateFilter.endDate)
        : null;

      return (
        (!startDate || payoutDate >= startDate) &&
        (!endDate || payoutDate <= new Date(endDate).setHours(23, 59, 59))
      );
    });
  }, [payouts, payoutDateFilter]);

  // Calculate total payout amount for the filtered payouts
  const totalPayoutAmount = useMemo(() => {
    return filteredPayouts.reduce((total, payout) => {
      return total + (payout.netAmount || 0);
    }, 0);
  }, [filteredPayouts]);

  const handleMentorSelect = useCallback((mentor) => {
    setSelectedMentor(mentor);
    setMentorSearch("");
    setMentors([]);
  }, []);

  const clearFilters = useCallback(() => {
    if (activeTab === "sessions") {
      setDateFilter({ option: "all", startDate: "", endDate: "" });
    } else if (activeTab === "payouts") {
      setPayoutDateFilter({ option: "all", startDate: "", endDate: "" });
    }
    setSelectedMentor(null);
    setMentorSearch("");
  }, [activeTab]);

  const getStatusCount = useCallback(
    (status) => {
      if (activeTab === "sessions") {
        switch (status) {
          case "paid":
            return sessions.filter((s) => s.isPaid).length;
          case "unpaid":
            return sessions.filter((s) => !s.isPaid).length;
          default:
            return sessions.length;
        }
      } else if (activeTab === "payouts") {
        switch (status) {
          case "paid":
            return payouts.filter((p) => p.status === PAYMENT_STATUS.PAID)
              .length;
          case "pending":
            return payouts.filter((p) => p.status === PAYMENT_STATUS.PENDING)
              .length;
          default:
            return payouts.length;
        }
      } else if (activeTab === "pendingQueries") {
        return pendingQueries.filter((q) => {
          if (status === "contacted") return q.status === "Contacted";
          if (status === "notContacted") return q.status === "Not Contacted";
          return true;
        }).length;
      }
      return 0;
    },
    [activeTab, sessions, payouts, pendingQueries, PAYMENT_STATUS]
  );

  const handleUnreadCountChange = useCallback((count) => {
    setUnreadMessages(count);
  }, []);

  const handleContactStatus = useCallback(
    async (queryId, currentStatus) => {
      const newStatus =
        currentStatus === "Not Contacted" ? "Contacted" : "Not Contacted";
      const queryRef = ref(database, `pendingQueries/${queryId}`);
      await update(queryRef, { status: newStatus });

      setPendingQueries((prev) =>
        prev.map((query) =>
          query.id === queryId ? { ...query, status: newStatus } : query
        )
      );
    },
    [database]
  );

  // Add audit logging for new payouts
  const handleNewPayout = useCallback(
    async (payoutData) => {
      try {
        const newPayout = {
          ...payoutData,
          createdAt: serverTimestamp(),
        };

        const payoutRef = await addDoc(collection(db, "payouts"), newPayout);

        // Log the creation in audit trail
        await createActivityLog({
          userId: "admin", // Admin creates payouts
          userEmail: payoutData.mentorEmail || "unknown",
          userRole: "admin",
          actionType: "create_payout",
          actionDetails: `Created new payout for ${newPayout.mentorEmail}`,
          timestamp: new Date(),
        });

        return payoutRef;
      } catch (error) {
        console.error("Error creating payout:", error);
        throw error;
      }
    },
    [db]
  );

  useEffect(() => {
    if (loading && activeTab !== "auditLogs") {
      showLoader(`Loading ${activeTab}...`);
    } else if (loading && activeTab === "auditLogs") {
      showLoader("Loading audit logs...");
    } else {
      hideLoader();
    }
  }, [loading, activeTab]);

  return (
    <div className="dashboard admin-dashboard fade-in">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <p>Manage mentor sessions, process payouts, and handle user queries</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("sessions");
            setStatusFilter("all");
          }}
        >
          Sessions
        </button>
        <button
          className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("payouts");
            setStatusFilter("all");
          }}
        >
          Payouts
        </button>
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => setActiveTab("new")}
        >
          New Session
        </button>
        <button
          className={`tab-button ${activeTab === "chat" ? "active" : ""} ${
            unreadMessages > 0 ? "has-notification" : ""
          }`}
          onClick={() => setActiveTab("chat")}
        >
          Chat with Mentors
          {unreadMessages > 0 && (
            <span className="tab-notification">{unreadMessages}</span>
          )}
        </button>
        <button
          className={`tab-button ${
            activeTab === "pendingQueries" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("pendingQueries");
            setStatusFilter("all");
          }}
        >
          Pending Queries
        </button>
        <button
          className={`tab-button ${activeTab === "auditLogs" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("auditLogs");
            setStatusFilter("all");
          }}
        >
          Audit Trail
        </button>
      </div>

      {(activeTab === "sessions" ||
        activeTab === "payouts" ||
        activeTab === "pendingQueries") && (
        <>
          <div className="status-bookmarks">
            <button
              className={`bookmark ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All
              <span className="count">
                {activeTab === "sessions"
                  ? sessions.length
                  : activeTab === "payouts"
                  ? payouts.length
                  : pendingQueries.length}
              </span>
            </button>
            {activeTab === "sessions" ? (
              <>
                <button
                  className={`bookmark ${
                    statusFilter === "paid" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("paid")}
                >
                  Paid
                  <span className="count">{getStatusCount("paid")}</span>
                </button>
                <button
                  className={`bookmark ${
                    statusFilter === "unpaid" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("unpaid")}
                >
                  Unpaid
                  <span className="count">{getStatusCount("unpaid")}</span>
                </button>
              </>
            ) : activeTab === "payouts" ? (
              <>
                <button
                  className={`bookmark ${
                    statusFilter === "paid" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("paid")}
                >
                  Paid
                  <span className="count">{getStatusCount("paid")}</span>
                </button>
                <button
                  className={`bookmark ${
                    statusFilter === "pending" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending
                  <span className="count">{getStatusCount("pending")}</span>
                </button>
              </>
            ) : activeTab === "pendingQueries" ? (
              <>
                <button
                  className={`bookmark ${
                    statusFilter === "notContacted" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("notContacted")}
                >
                  Not Contacted
                  <span className="count">
                    {getStatusCount("notContacted")}
                  </span>
                </button>
                <button
                  className={`bookmark ${
                    statusFilter === "contacted" ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter("contacted")}
                >
                  Contacted
                  <span className="count">{getStatusCount("contacted")}</span>
                </button>
              </>
            ) : null}
          </div>

          {(activeTab === "sessions" || activeTab === "payouts") && (
            <div className="filter-controls">
              <div className="search-filters">
                {activeTab === "sessions" && (
                  <>
                    <div className="mentor-search">
                      <div className="form-group">
                        <label htmlFor="mentorSearch">Search Mentor</label>
                        <div className="search-input-container">
                          <input
                            type="text"
                            id="mentorSearch"
                            value={mentorSearch}
                            onChange={(e) => setMentorSearch(e.target.value)}
                            placeholder="Search by mentor email..."
                          />
                          {searchLoading && (
                            <div className="search-loading">Searching...</div>
                          )}
                          {mentors.length > 0 && (
                            <div className="search-results">
                              {mentors.map((mentor) => (
                                <div
                                  key={mentor.id}
                                  className="search-result-item"
                                  onClick={() => handleMentorSelect(mentor)}
                                >
                                  {mentor.email}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedMentor && (
                        <div className="selected-mentor">
                          Selected: {selectedMentor.email}
                          <button
                            className="clear-selection"
                            onClick={() => setSelectedMentor(null)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="date-filters">
                      <div className="form-group">
                        <label htmlFor="dateRangeFilter">Date Range</label>
                        <select
                          id="dateRangeFilter"
                          className="filter-select"
                          value={dateFilter.option}
                          onChange={(e) =>
                            setDateFilter((prev) => ({
                              ...prev,
                              option: e.target.value,
                            }))
                          }
                        >
                          <option value="all">All Time</option>
                          <option value="7days">Last 7 Days</option>
                          <option value="15days">Last 15 Days</option>
                          <option value="30days">Last 30 Days</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>

                      {dateFilter.option === "custom" && (
                        <>
                          <div className="form-group">
                            <label htmlFor="startDate">Start Date</label>
                            <input
                              type="date"
                              id="startDate"
                              className="filter-date"
                              value={dateFilter.startDate}
                              onChange={(e) =>
                                setDateFilter((prev) => ({
                                  ...prev,
                                  startDate: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="endDate">End Date</label>
                            <input
                              type="date"
                              id="endDate"
                              className="filter-date"
                              value={dateFilter.endDate}
                              onChange={(e) =>
                                setDateFilter((prev) => ({
                                  ...prev,
                                  endDate: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                      <button className="text" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="dashboard-content">
        {loading && activeTab !== "auditLogs" ? null : (
          <>
            {activeTab === "sessions" && (
              <SessionList
                sessions={filteredSessions}
                isAdmin={true}
                payouts={payouts}
              />
            )}
            {activeTab === "payouts" && (
              <div className="payout-summary-section">
                <div className="payout-filters">
                  <div className="form-group">
                    <label htmlFor="payoutDateRangeFilter">Date Range</label>
                    <select
                      id="payoutDateRangeFilter"
                      className="filter-select"
                      value={payoutDateFilter.option}
                      onChange={(e) =>
                        setPayoutDateFilter((prev) => ({
                          ...prev,
                          option: e.target.value,
                        }))
                      }
                    >
                      <option value="all">All Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="15days">Last 15 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {payoutDateFilter.option === "custom" && (
                    <div className="custom-date-range">
                      <div className="form-group">
                        <label htmlFor="payoutStartDate">Start Date</label>
                        <input
                          type="date"
                          id="payoutStartDate"
                          className="filter-date"
                          value={payoutDateFilter.startDate}
                          onChange={(e) =>
                            setPayoutDateFilter((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="payoutEndDate">End Date</label>
                        <input
                          type="date"
                          id="payoutEndDate"
                          className="filter-date"
                          value={payoutDateFilter.endDate}
                          onChange={(e) =>
                            setPayoutDateFilter((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  <button className="text" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>

                <PayoutList payouts={filteredPayouts} isAdmin={true} />
              </div>
            )}
            {activeTab === "new" && <SessionForm />}
            {activeTab === "chat" && (
              <ChatSection onUnreadCountChange={handleUnreadCountChange} />
            )}
            {activeTab === "pendingQueries" && (
              <div className="pending-queries">
                {pendingQueries.length === 0 ? (
                  <div className="empty-state">
                    <h3>No Pending Queries</h3>
                    <p>
                      No users have requested further assistance at the moment.
                    </p>
                  </div>
                ) : (
                  <table className="queries-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingQueries
                        .filter(
                          (query) =>
                            statusFilter === "all" ||
                            (statusFilter === "contacted" &&
                              query.status === "Contacted") ||
                            (statusFilter === "notContacted" &&
                              query.status === "Not Contacted")
                        )
                        .map((query) => (
                          <tr key={query.id}>
                            <td>{query.name}</td>
                            <td>{query.email}</td>
                            <td>{query.status}</td>
                            <td>
                              <button
                                className="action-btn status-btn"
                                onClick={() =>
                                  handleContactStatus(query.id, query.status)
                                }
                              >
                                Mark as{" "}
                                {query.status === "Not Contacted"
                                  ? "Contacted"
                                  : "Not Contacted"}
                              </button>
                              <a
                                href={`https://mail.google.com/mail/?view=cm&to=${query.email}&su=Support%20Request%20-%20masaipe`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn email-btn"
                              >
                                Email User
                              </a>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {activeTab === "auditLogs" && (
              <div className="audit-logs-section">
                <div className="audit-logs-filters">
                  <div className="search-filters">
                    <div className="form-group">
                      <label htmlFor="auditLogSearch">
                        Search by User Email
                      </label>
                      <input
                        type="text"
                        id="auditLogSearch"
                        value={auditLogSearch}
                        onChange={(e) => setAuditLogSearch(e.target.value)}
                        placeholder="Enter user email..."
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="actionTypeFilter">Filter by Action</label>
                      <select
                        id="actionTypeFilter"
                        value={auditActionFilter}
                        onChange={(e) => setAuditActionFilter(e.target.value)}
                      >
                        <option value="all">All Actions</option>
                        <option value="login">Login Events</option>
                        <option value="logout">Logout Events</option>
                        <option value="create_session">Session Creation</option>
                        <option value="update_session">Session Updates</option>
                        <option value="delete_session">Session Deletion</option>
                        <option value="mark_attendance">
                          Attendance Marking
                        </option>
                        <option value="create_payout">Payout Creation</option>
                        <option value="update_payout_status">
                          Payout Status Changes
                        </option>
                        {actionTypes
                          .filter(
                            (type) =>
                              ![
                                "login",
                                "logout",
                                "create_session",
                                "update_session",
                                "delete_session",
                                "mark_attendance",
                                "create_payout",
                                "update_payout_status",
                              ].includes(type)
                          )
                          .map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      className="text"
                      onClick={() => {
                        setAuditLogSearch("");
                        setAuditActionFilter("all");
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Only show in development mode */}
                {process.env.NODE_ENV === "development" && (
                  <div
                    className="audit-logs-debug"
                    style={{
                      backgroundColor: "#f0f0f0",
                      padding: "10px",
                      margin: "10px 0",
                      borderRadius: "5px",
                      fontSize: "12px",
                      display: "none", // Hide debug info
                    }}
                  >
                    <p>
                      <strong>Debug Info:</strong> Filter: {auditActionFilter},
                      Search: {auditLogSearch || "none"}
                    </p>
                    <p>
                      Available action types: {actionTypes.join(", ") || "none"}
                    </p>
                    <button
                      style={{
                        padding: "5px 10px",
                        backgroundColor: "#333",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      onClick={async () => {
                        try {
                          const logId = await createActivityLog({
                            userId: "debug-id",
                            userEmail: "debug@" + window.location.hostname,
                            userRole: "debugger",
                            actionType: "debug_action",
                            actionDetails:
                              "Debug action from audit logs screen",
                            timestamp: new Date(),
                          });
                          alert(`Debug log created with ID: ${logId}`);
                        } catch (error) {
                          console.error("Error creating debug log:", error);
                          alert("Error creating debug log: " + error.message);
                        }
                      }}
                    >
                      Create Debug Log
                    </button>
                  </div>
                )}

                <AuditLogsList
                  searchTerm={auditLogSearch}
                  actionType={auditActionFilter}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
