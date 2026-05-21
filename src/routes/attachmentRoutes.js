const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const { uploadEvidence: deliverableMiddleware } = require("../middleware/upload");
const {
  uploadInitialDeliverable,
  uploadNewVersion,
  getVersionHistory,
  reviewDeliverable,
  deleteDeliverable,
  submitDeliverable,
} = require("../controllers/attachmentController");

const router = express.Router();

// All attachment routes require authentication
router.use(protect);

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RESEARCHER WORKFLOW
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/**
 * POST /api/tasks/:taskId/attachments
 * Upload initial deliverable
 * Required: file, title
 * Optional: description
 * Moves task to REVIEW status
 */
router.post(
  "/:taskId/attachments",
  strictRoleMiddleware(["principal", "co-researcher"]),
  (req, res, next) => {
    deliverableMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  uploadInitialDeliverable
);

/**
 * POST /api/tasks/:taskId/attachments/:attachmentId/version
 * Upload new version after changes requested
 * Required: file
 * Optional: changeReason
 * Moves task back to REVIEW status
 */
router.post(
  "/:taskId/attachments/:attachmentId/version",
  strictRoleMiddleware(["principal", "co-researcher"]),
  (req, res, next) => {
    deliverableMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  uploadNewVersion
);

/**
 * GET /api/tasks/:taskId/attachments/:attachmentId/versions
 * Get complete version history for a deliverable
 */
router.get(
  "/:taskId/attachments/:attachmentId/versions",
  getVersionHistory
);

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * COORDINATOR REVIEW WORKFLOW
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/**
 * PATCH /api/tasks/:taskId/attachments/:attachmentId/review
 * Review deliverable (approve or reject)
 * Required: approved (boolean)
 * Optional: feedback (required if approved=false)
 * 
 * On Approve:
 *   - Version status → "approved"
 *   - Attachment status → "approved"
 *   - Task status → "done"
 * 
 * On Reject:
 *   - Version status → "rejected"
 *   - Attachment status → "rejected"
 *   - Task status → "changes-requested"
 *   - Feedback stored in reviewFeedback field
 */
router.patch(
  "/:taskId/attachments/:attachmentId/review",
  strictRoleMiddleware(["coordinator"]),
  reviewDeliverable
);

/**
 * PATCH /api/tasks/:taskId/attachments/:attachmentId/submit
 * Submit saved deliverable manually for coordinator review.
 * Principal or co-researcher
 */
router.patch(
  "/:taskId/attachments/:attachmentId/submit",
  strictRoleMiddleware(["principal", "co-researcher"]),
  submitDeliverable
);

/**
 * DELETE /api/tasks/:taskId/attachments/:attachmentId
 * Delete a deliverable draft (soft-delete).
 * Researchers only — task must be in-progress or changes-requested.
 * Approved deliverables cannot be deleted.
 */
router.delete(
  "/:taskId/attachments/:attachmentId",
  strictRoleMiddleware(["principal", "co-researcher"]),
  deleteDeliverable
);

module.exports = router;
