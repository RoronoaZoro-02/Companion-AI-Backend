// COMPANION AI - HYBRID SMART ENGINE BACKEND
// Templates + Free AI API (Groq) Fallback
// Deploy on Render.com (free)

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// SMART RESPONSE TEMPLATES
// ============================================

const templates = {
  "Mental Health": [
    "I hear you. That sounds really challenging. Let's break this down into manageable steps. First, acknowledge that what you're feeling is valid. Many people experience similar struggles. Here's what might help: start small with one action today, practice self-compassion, and remember that progress isn't always linear.",
    
    "It's completely normal to feel this way. You're not alone in this struggle. What you're experiencing is something many people face. Here's a practical approach: identify one small thing you can control right now, focus on that, and build from there. Consider talking to someone you trust.",
    
    "I understand how overwhelming this feels right now. Take a breath. What you're experiencing is valid and manageable. Here's my suggestion: break the problem into smaller pieces, address them one at a time, and be kind to yourself throughout the process. Progress matters more than perfection.",
    
    "Your feelings are real and important. This situation feels intense right now, but many people have navigated similar challenges. Here's what research shows helps: set small, achievable goals, maintain routines, connect with others, and give yourself grace.",
    
    "I recognize the weight you're carrying. First, know that seeking support shows strength, not weakness. Here's a structured approach: identify what's in your control, focus your energy there, build a support system, and celebrate small wins."
  ],
  
  "Career": [
    "This is a significant career decision. Let me help you think through it strategically. Consider these factors: market demand for your skills, growth potential, company culture fit, compensation vs. happiness trade-off, and long-term career trajectory. What matters most to you?",
    
    "Career transitions can be daunting, but they're often necessary for growth. Here's a tactical approach: update your resume/portfolio, network in your target industry, practice your pitch, research companies thoroughly, and prepare for interviews by showcasing specific achievements.",
    
    "Your career concerns are valid. Here's what I recommend: assess your current situation objectively, identify what you want to change, develop a concrete action plan, upskill in high-demand areas, and start making moves while staying employed if possible.",
    
    "Career growth requires strategy. Here's my framework: define your 5-year goal, reverse-engineer the steps needed, identify skill gaps, create a learning plan, build your professional network, and take consistent action toward your target.",
    
    "This is an opportunity to make a strategic move. Consider: your strengths and how the market values them, companies that align with your values, roles that offer growth, and what the next logical step in your career looks like. You have more options than you realize."
  ],
  
  "Productivity": [
    "Productivity struggles are common, but fixable. Here's a proven system: break tasks into smaller chunks, prioritize ruthlessly (focus on 3 main goals daily), eliminate distractions, use time-blocking, and take strategic breaks. Start with one technique and build from there.",
    
    "You're overcomplicating this. Simplicity is key to productivity. Here's what works: clear your workspace, identify your 1-3 most important tasks, work in focused 90-minute blocks, minimize context switching, and track completion. Momentum builds on itself.",
    
    "Productivity isn't about working harder; it's about working smarter. Try this: identify your peak energy times, schedule deep work then, batch similar tasks, automate repetitive work, and ruthlessly say no to low-impact activities. Quality beats quantity.",
    
    "Feeling stuck? Reset your system. Here's how: audit your current habits, remove energy drains, create an environment optimized for focus, establish clear routines, and build accountability. Small consistent actions compound into major results.",
    
    "Your productivity challenges have a solution. Consider: are you procrastinating due to perfectionism or fear? Start with the smallest viable step. Use the 2-minute rule: if it takes less than 2 minutes, do it now. Build momentum with quick wins first."
  ],
  
  "Finance": [
    "Financial planning is about control and clarity. Here's the framework: audit your current situation, categorize spending, create a budget (50/30/20 rule: needs/wants/savings), build an emergency fund, and start investing. Progress over perfection matters.",
    
    "Money stress is real, but manageable with a system. Start here: track every expense for one month, identify waste, create a realistic budget, pay yourself first (save before spending), and tackle debt systematically. Small changes compound.",
    
    "Building wealth takes strategy and patience. Here's the proven path: stabilize income, reduce unnecessary expenses, build an emergency fund (3-6 months), pay off high-interest debt, then invest in index funds. Consistency beats timing.",
    
    "Your financial situation can improve with intentional action. Start by: calculating your net worth, setting specific financial goals, creating a step-by-step plan, automating savings, and learning about investments. Knowledge reduces financial anxiety.",
    
    "Financial independence is achievable. Here's the framework: live below your means, automate savings, diversify income, invest consistently, and stay disciplined. Most millionaires got there through consistent small actions over time, not luck."
  ]
};

// ============================================
// FREE AI API - GROQ (Alternative: Together AI)
// ============================================

async function getAIResponse(userMessage, category, history) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      console.log('Groq API key not configured. Using template fallback.');
      return null;
    }

    // Build conversation history for context
    const conversationHistory = history.map(msg => ({
      role: msg.user ? 'user' : 'assistant',
      content: msg.text
    }));

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const systemPrompt = `You are Companion AI, a helpful problem-solving assistant. 
Category: ${category}
Your responses should be:
- Empathetic and supportive
- Practical and actionable
- Concise (2-3 sentences)
- Conversational and warm
- Focused on solutions

Keep responses brief and engaging. End with a question or call-to-action.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: conversationHistory,
        system: systemPrompt,
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error.message);
    return null; // Fall back to templates
  }
}

// ============================================
// HYBRID SMART ENGINE
// ============================================

function getSmartResponse(userMessage, category, history) {
  // Step 1: Try to match with template
  const categoryTemplates = templates[category];
  
  if (categoryTemplates && categoryTemplates.length > 0) {
    // Check if question is common (has certain keywords)
    const commonKeywords = ['help', 'what', 'how', 'feel', 'problem', 'stuck', 'challenge'];
    const isCommon = commonKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
    
    if (isCommon) {
      // Use template (faster, looks good)
      const randomIndex = Math.floor(Math.random() * categoryTemplates.length);
      return {
        response: categoryTemplates[randomIndex],
        source: 'template'
      };
    }
  }
  
  // Step 2: If niche question, request will come with flag for API
  return null; // Signal to use API
}

// ============================================
// LOGGING & ANALYTICS
// ============================================

const userUsage = {}; // Track API calls per user

function logUsage(userId, category, source) {
  if (!userUsage[userId]) {
    userUsage[userId] = {
      totalMessages: 0,
      templateMessages: 0,
      apiMessages: 0,
      categories: {},
      firstMessage: new Date(),
      lastMessage: new Date()
    };
  }
  
  const usage = userUsage[userId];
  usage.totalMessages++;
  usage.lastMessage = new Date();
  
  if (source === 'template') {
    usage.templateMessages++;
  } else if (source === 'api') {
    usage.apiMessages++;
  }
  
  if (!usage.categories[category]) {
    usage.categories[category] = 0;
  }
  usage.categories[category]++;
  
  console.log(`[USAGE] User ${userId} - ${source} - ${category}`);
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Companion AI backend is running' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, category, history = [] } = req.body;

    // Validation
    if (!message || !category) {
      return res.status(400).json({ 
        error: 'Missing message or category' 
      });
    }

    // Step 1: Try smart template
    const smartResponse = getSmartResponse(message, category, history);
    
    if (smartResponse) {
      logUsage(userId, category, smartResponse.source);
      return res.json({
        response: smartResponse.response,
        source: smartResponse.source,
        timestamp: new Date()
      });
    }

    // Step 2: Fall back to free API (Groq)
    const apiResponse = await getAIResponse(message, category, history);
    
    if (apiResponse) {
      logUsage(userId, category, 'api');
      return res.json({
        response: apiResponse,
        source: 'api',
        timestamp: new Date()
      });
    }

    // Step 3: If everything fails, use generic fallback
    logUsage(userId, category, 'fallback');
    return res.json({
      response: "I appreciate your question. That's a nuanced topic. What specific aspect would you like to explore further?",
      source: 'fallback',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Server error. Please try again.' 
    });
  }
});

// Usage stats endpoint (for admin)
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const stats = userUsage[userId] || { message: 'No data for this user' };
  res.json(stats);
});

// Retrieve all usage (for monitoring)
app.get('/api/stats', (req, res) => {
  res.json({
    totalUsers: Object.keys(userUsage).length,
    totalMessages: Object.values(userUsage).reduce((sum, user) => sum + user.totalMessages, 0),
    breakdown: userUsage
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Companion AI Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});
