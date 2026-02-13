// COMPANION AI - MENTAL HEALTH BACKEND
// Knowledge Base Search + Dual Response Mode (Normal/Detailed)
// Deploy on Render.com (free)

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendWelcomeEmail, sendPaymentReceiptEmail } = require('./emailService');
const { checkRefundEligibility, createRefundRequest, processRefundRequest, executeRefund, revertPremiumStatus, createDispute } = require('./refundService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// LOAD MENTAL HEALTH KNOWLEDGE BASE
// ============================================

let knowledgeBase = {};

try {
  const knowledgePath = path.join(__dirname, 'mental_health_knowledge.json');
  const knowledgeData = fs.readFileSync(knowledgePath, 'utf8');
  knowledgeBase = JSON.parse(knowledgeData).knowledge_base;
  console.log('✅ Knowledge base loaded with', Object.keys(knowledgeBase).length, 'topics');
} catch (error) {
  console.error('⚠️ Could not load knowledge base:', error.message);
  // Fallback to empty knowledge base
  knowledgeBase = {};
}

// ============================================
// GREETING DETECTION
// ============================================

function isGreeting(userMessage) {
  const greetings = ['hello', 'hi', 'hey', 'what\'s up', 'howdy', 'greetings', 'welcome', 'good morning', 'good afternoon', 'good evening'];
  const messageLower = userMessage.toLowerCase().trim();
  
  return greetings.some(greeting => messageLower.includes(greeting) || messageLower === greeting);
}

const greetingResponses = [
  "Hi there! Welcome to Mental Health Companion. I'm here to listen and support you. What's on your mind today?",
  "Hello! I'm glad you're here. Mental Health Companion is all about understanding what you're going through. What would you like to talk about?",
  "Hey! Welcome. I'm here to help you work through whatever you're experiencing. What's bothering you?",
  "Hi! Great to have you. I listen without judgment and provide real guidance. What's going on?"
];

function getGreetingResponse() {
  return greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
}

// ============================================
// SEARCH KNOWLEDGE BASE (IMPROVED)
// ============================================

function searchKnowledgeBase(userMessage) {
  const messageLower = userMessage.toLowerCase();
  let matchedTopic = null;
  let maxMatches = 0;

  // Search for keywords in each topic
  for (const [topic, data] of Object.entries(knowledgeBase)) {
    const keywords = data.keywords || [];
    let matches = 0;

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      // Check if keyword is in message (improved matching)
      if (messageLower.includes(keywordLower)) {
        matches++;
      }
    });

    // If any match found, prefer exact/close matches
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedTopic = { topic, data };
    }
  }

  // Fallback: check for partial word matches if no exact match
  if (!matchedTopic) {
    for (const [topic, data] of Object.entries(knowledgeBase)) {
      const keywords = data.keywords || [];
      for (const keyword of keywords) {
        if (messageLower.split(' ').some(word => word.includes(keyword.toLowerCase().substring(0, 4)))) {
          return { topic, data };
        }
      }
    }
  }

  return matchedTopic;
}

// ============================================
// FORMAT RESPONSE - NORMAL MODE (Conversational)
// ============================================

function formatNormalResponse(topicData) {
  const { definition, immediate_relief, long_term_solutions, root_causes } = topicData;
  
  const responses = [
    `I understand what you're experiencing. ${definition} This is something many people struggle with. Based on what you've shared, here are some immediate things that can help: ${immediate_relief[0] || 'Take a moment to breathe'}. Would you like to know more about managing this?`,
    
    `That sounds challenging. What you're describing is real and valid. ${definition} The roots can vary—sometimes it's ${root_causes[0]}, sometimes it's multiple things. What's important is finding what works for you. Have you tried any of these: ${immediate_relief[0]}?`,
    
    `I hear you. Many people experience this. The good news is there are concrete steps that help. ${immediate_relief[0]} is a powerful start. Over time, ${long_term_solutions[0]} creates lasting change. What feels most doable for you right now?`,
    
    `That must be difficult. What you're describing aligns with what many others experience. The key is addressing both immediate relief and longer-term solutions. Right now, ${immediate_relief[0]}. Then build toward ${long_term_solutions[0]}. Which interests you more?`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// ============================================
// FORMAT RESPONSE - DETAILED MODE (Structured)
// ============================================

function formatDetailedResponse(topicData) {
  const {
    definition,
    types,
    root_causes,
    impacts,
    immediate_relief,
    long_term_solutions,
    when_to_seek_help,
    resources
  } = topicData;

  return `
🔍 UNDERSTANDING YOUR EXPERIENCE

**What This Is:**
${definition}

**Types & How It Shows Up:**
${types.slice(0, 3).map(t => `• ${t}`).join('\n')}

**Common Root Causes:**
${root_causes.slice(0, 4).map(r => `• ${r}`).join('\n')}

**How It Affects You:**
${impacts.slice(0, 4).map(i => `• ${i}`).join('\n')}

⚡ IMMEDIATE RELIEF (Do These Now):
${immediate_relief.slice(0, 3).map((ir, i) => `${i + 1}. ${ir}`).join('\n')}

🛤️ LONG-TERM SOLUTIONS (Build Over Time):
${long_term_solutions.slice(0, 4).map((lt, i) => `${i + 1}. ${lt}`).join('\n')}

⚠️ WHEN TO SEEK PROFESSIONAL HELP:
${when_to_seek_help}

📚 RESOURCES:
${resources.slice(0, 2).map(r => `• ${r}`).join('\n')}

---
Remember: Progress over perfection. Start with one small step today.
  `.trim();
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const fallbackResponses = {
  normal: [
    "That sounds like something important you're dealing with. I'm here to help. Can you tell me a bit more about what you're experiencing? Sometimes talking through it helps clarify things.",
    "I appreciate you sharing that. What you're going through matters. Have you noticed any patterns or specific times when this feels worse or better?",
    "It's courageous to open up about this. Everyone's experience is unique. What would be most helpful for you right now—understanding what's happening, or finding ways to cope?"
  ],
  detailed: `
📋 GENERAL GUIDANCE

**Your Experience:**
You've shared something meaningful. While I want to provide specific guidance, understanding more about your situation will help me give better advice.

**Next Steps:**
• Share more details: When did this start? What triggers it?
• Describe the impact: How is this affecting your daily life?
• Identify your goals: What would improvement look like?

**General Principles That Help Most People:**
1. Physical care: Sleep, movement, nutrition
2. Social connection: Talk to someone you trust
3. Professional support: Consider a therapist or counselor
4. Patience: Change takes time, usually 2-4 weeks to see shifts

**Resources:**
• Crisis support: 988 Suicide & Crisis Lifeline
• 7 Cups: Free emotional support
• Therapy apps: BetterHelp, Talkspace, Headspace

Remember: Seeking help is a sign of strength, not weakness.
  `
};

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mental Health Backend is running' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, detailedMode = false } = req.body;

    // Validation
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // CHECK FOR GREETING FIRST
    if (isGreeting(message)) {
      return res.json({
        response: getGreetingResponse(),
        topic: 'greeting',
        mode: detailedMode ? 'detailed' : 'normal',
        source: 'greeting',
        timestamp: new Date()
      });
    }

    // Search knowledge base
    const match = searchKnowledgeBase(message);

    let response;

    if (match) {
      // Found matching topic
      if (detailedMode) {
        response = formatDetailedResponse(match.data);
      } else {
        response = formatNormalResponse(match.data);
      }

      return res.json({
        response: response,
        topic: match.topic,
        mode: detailedMode ? 'detailed' : 'normal',
        source: 'knowledge_base',
        timestamp: new Date()
      });
    }

    // No match found - use fallback
    const fallback = detailedMode 
      ? fallbackResponses.detailed
      : fallbackResponses.normal[Math.floor(Math.random() * fallbackResponses.normal.length)];

    return res.json({
      response: fallback,
      topic: null,
      mode: detailedMode ? 'detailed' : 'normal',
      source: 'fallback',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Send welcome email on signup
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Missing email or name' });
    }

    const result = await sendWelcomeEmail(email, name);
    
    if (result.success) {
      return res.json({ success: true, message: 'Welcome email sent', emailId: result.emailId });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send payment receipt email
app.post('/api/send-payment-receipt', async (req, res) => {
  try {
    const { email, name, orderId, amount } = req.body;
    
    if (!email || !name || !orderId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendPaymentReceiptEmail(email, name, orderId, amount);
    
    if (result.success) {
      return res.json({ success: true, message: 'Receipt email sent', emailId: result.emailId });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Payment receipt error:', error);
    res.status(500).json({ error: 'Failed to send receipt email' });
  }
});

// Check refund eligibility
app.post('/api/check-refund-eligibility', async (req, res) => {
  try {
    const { userId, transactionId, reason } = req.body;

    if (!userId || !transactionId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In real scenario: fetch transaction from Firestore
    // For now: mock transaction
    const transaction = {
      id: transactionId,
      amount: 599,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'success'
    };

    const eligibility = checkRefundEligibility(transaction, reason);

    return res.json({
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      refundAmount: eligibility.refundAmount,
      message: eligibility.message,
      refundWindow: '30 days from purchase'
    });
  } catch (error) {
    console.error('Refund eligibility error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Request refund
app.post('/api/request-refund', async (req, res) => {
  try {
    const { userId, transactionId, reason, description } = req.body;

    if (!userId || !transactionId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create refund request
    const refundRequest = createRefundRequest(userId, transactionId, 599, reason, description);

    // In real scenario: Save to Firestore
    // db.collection('users').doc(userId).collection('refunds').doc(refundRequest.refundId).set(refundRequest);

    return res.json({
      success: true,
      message: 'Refund request submitted',
      refundId: refundRequest.refundId,
      status: refundRequest.status,
      note: 'Our team will review your request within 2-3 business days',
      refundRequest: refundRequest
    });
  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({ error: 'Failed to submit refund request' });
  }
});

// Get refund status
app.get('/api/refund-status/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;

    if (!refundId) {
      return res.status(400).json({ error: 'Missing refund ID' });
    }

    // In real scenario: Fetch from Firestore
    // For now: mock response
    const refundStatus = {
      refundId: refundId,
      status: 'approved', // pending, approved, rejected, processed
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      amount: 599,
      refundMethod: 'original_payment_method',
      expectedArrival: '3-5 business days',
      message: 'Your refund has been approved and will be processed shortly'
    };

    return res.json(refundStatus);
  } catch (error) {
    console.error('Refund status error:', error);
    res.status(500).json({ error: 'Failed to get refund status' });
  }
});

// Create dispute (for unauthorized charges)
app.post('/api/create-dispute', async (req, res) => {
  try {
    const { userId, transactionId, reason, evidence } = req.body;

    if (!userId || !transactionId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create dispute
    const dispute = createDispute(userId, transactionId, reason, evidence);

    // In real scenario: Save to Firestore
    // db.collection('users').doc(userId).collection('disputes').doc(dispute.disputeId).set(dispute);

    return res.json({
      success: true,
      message: 'Dispute created. We will investigate and respond within 5-7 business days',
      disputeId: dispute.disputeId,
      status: dispute.status,
      dispute: dispute
    });
  } catch (error) {
    console.error('Dispute creation error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Mental Health Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`📚 Knowledge base topics: ${Object.keys(knowledgeBase).join(', ')}`);
});
