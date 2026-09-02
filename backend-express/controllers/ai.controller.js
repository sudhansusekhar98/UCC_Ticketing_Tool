import asyncHandler from '../utils/asyncHandler.js';
import { getTicketSuggestions, askAssistant } from '../utils/gemini.utils.js';
import { TOOL_DECLARATIONS, runTool } from '../services/aiTools.js';

// @desc    Get AI suggested category/subcategory + troubleshooting steps for a ticket draft
// @route   POST /api/ai/suggest
// @access  Private
export const suggest = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;
  if (!title && !description) {
    return res.status(400).json({ success: false, message: 'title or description is required' });
  }

  const result = await getTicketSuggestions({ title, description, category });
  res.json({ success: true, data: result });
});

// @desc    Ask the AI assistant a question (RBAC-scoped tool calling, guardrailed to org topics)
// @route   POST /api/ai/chat
// @access  Private
export const chat = asyncHandler(async (req, res) => {
  const { message, history, ticketContext } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, message: 'message is required' });
  }

  const result = await askAssistant({
    message,
    history: Array.isArray(history) ? history.slice(-10) : [], // cap context sent per turn
    ticketContext,
    toolDeclarations: TOOL_DECLARATIONS,
    runTool: (name, args) => runTool(req.user, name, args)
  });

  res.json({ success: true, data: result });
});
