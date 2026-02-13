// REFUND SYSTEM MODULE
// Handles: Refund requests, eligibility checks, status tracking, refund processing

const { sendRefundApprovedEmail, sendRefundRejectedEmail } = require('./emailService');

// ============================================
// REFUND ELIGIBILITY RULES
// ============================================

const REFUND_RULES = {
  REFUND_WINDOW_DAYS: 30,           // Can refund within 30 days
  MIN_SUBSCRIPTION_DAYS: 0,          // Can refund immediately
  DISPUTE_WINDOW_DAYS: 90,           // Can dispute within 90 days
  REFUND_PERCENTAGE: 100,            // 100% refund (no partial)
  REFUND_REASONS: [
    'not_satisfied',
    'technical_issue',
    'duplicate_charge',
    'accidental_purchase',
    'other'
  ]
};

// ============================================
// CHECK REFUND ELIGIBILITY
// ============================================

function checkRefundEligibility(transaction, reason) {
  const eligibility = {
    eligible: false,
    reason: null,
    refundAmount: 0,
    message: null
  };

  // Check if transaction exists
  if (!transaction) {
    eligibility.reason = 'transaction_not_found';
    eligibility.message = 'Transaction not found in our system';
    return eligibility;
  }

  // Check if already refunded
  if (transaction.status === 'refunded') {
    eligibility.reason = 'already_refunded';
    eligibility.message = 'This transaction has already been refunded';
    return eligibility;
  }

  // Check if refund window has passed
  const transactionDate = new Date(transaction.timestamp);
  const daysSincePurchase = Math.floor((new Date() - transactionDate) / (1000 * 60 * 60 * 24));

  if (daysSincePurchase > REFUND_RULES.REFUND_WINDOW_DAYS) {
    eligibility.reason = 'outside_refund_window';
    eligibility.message = `Refund window has passed. You had ${REFUND_RULES.REFUND_WINDOW_DAYS} days to request a refund.`;
    return eligibility;
  }

  // Check if reason is valid
  if (!REFUND_RULES.REFUND_REASONS.includes(reason)) {
    eligibility.reason = 'invalid_reason';
    eligibility.message = 'Please provide a valid refund reason';
    return eligibility;
  }

  // ELIGIBLE FOR REFUND
  eligibility.eligible = true;
  eligibility.reason = 'eligible';
  eligibility.refundAmount = transaction.amount;
  eligibility.message = `Eligible for ₹${transaction.amount} refund`;

  return eligibility;
}

// ============================================
// REFUND REQUEST OBJECT
// ============================================

function createRefundRequest(userId, transactionId, amount, reason, description) {
  return {
    refundId: 'REF_' + Date.now(),
    userId: userId,
    transactionId: transactionId,
    amount: amount,
    reason: reason,
    description: description,
    status: 'pending', // pending, approved, rejected, processed
    requestedAt: new Date(),
    approvedAt: null,
    processedAt: null,
    rejectionReason: null,
    refundMethod: null, // bank_transfer, original_payment_method
    notes: ''
  };
}

// ============================================
// PROCESS REFUND REQUEST
// ============================================

async function processRefundRequest(refundRequest, adminApproval = true, rejectionReason = null) {
  try {
    if (adminApproval) {
      // Approve refund
      refundRequest.status = 'approved';
      refundRequest.approvedAt = new Date();
      refundRequest.refundMethod = 'original_payment_method';
      
      return {
        success: true,
        message: 'Refund approved',
        refundRequest: refundRequest
      };
    } else {
      // Reject refund
      refundRequest.status = 'rejected';
      refundRequest.rejectionReason = rejectionReason || 'Does not meet refund criteria';
      
      return {
        success: false,
        message: 'Refund rejected',
        refundRequest: refundRequest
      };
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// PROCESS REFUND (ACTUAL TRANSFER)
// ============================================

async function executeRefund(refundRequest, transactionId) {
  try {
    // In real scenario: Call Razorpay refund API
    // For now: Mock the refund process

    refundRequest.status = 'processed';
    refundRequest.processedAt = new Date();

    console.log(`✅ Refund processed: ${refundRequest.refundId} for ₹${refundRequest.amount}`);

    return {
      success: true,
      message: 'Refund processed successfully',
      refundId: refundRequest.refundId,
      amount: refundRequest.amount,
      processedDate: refundRequest.processedAt,
      expectedArrival: '3-5 business days'
    };
  } catch (error) {
    console.error('Error executing refund:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// REVERT PREMIUM STATUS (After Refund)
// ============================================

async function revertPremiumStatus(userId, db) {
  try {
    await db.collection('users').doc(userId).update({
      isPremium: false,
      premiumRevokedAt: new Date(),
      reason: 'refund_processed'
    });

    console.log(`✅ Premium status reverted for user: ${userId}`);

    return {
      success: true,
      message: 'Premium access revoked'
    };
  } catch (error) {
    console.error('Error reverting premium:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// DISPUTE HANDLING
// ============================================

function createDispute(userId, transactionId, reason, evidence) {
  return {
    disputeId: 'DSP_' + Date.now(),
    userId: userId,
    transactionId: transactionId,
    reason: reason, // unauthorized_charge, duplicate_charge, service_not_provided, etc
    evidence: evidence, // description of issue
    status: 'open', // open, investigating, resolved, closed
    createdAt: new Date(),
    resolvedAt: null,
    resolution: null // approved_refund, rejected, partial_refund
  };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

module.exports = {
  REFUND_RULES,
  checkRefundEligibility,
  createRefundRequest,
  processRefundRequest,
  executeRefund,
  revertPremiumStatus,
  createDispute
};
