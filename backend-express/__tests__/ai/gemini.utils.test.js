/**
 * gemini.utils – guardrail + safe-degradation tests (mocked fetch, no real API call).
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getTicketSuggestions, askAssistant } from '../../utils/gemini.utils.js';

const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.GEMINI_API_KEY = originalKey;
  jest.clearAllMocks();
});

describe('getTicketSuggestions', () => {
  it('degrades safely to empty steps when Gemini returns malformed content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })
    });

    const result = await getTicketSuggestions({ title: 'Camera down', description: 'No feed' });

    expect(result.steps).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('parses a well-formed structured response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ suggestedCategory: 'Hardware', steps: ['Check power', 'Reboot NVR'] }) }] }
        }]
      })
    });

    const result = await getTicketSuggestions({ title: 'NVR offline', description: 'No power light' });

    expect(result.suggestedCategory).toBe('Hardware');
    expect(result.steps).toHaveLength(2);
  });
});

describe('askAssistant', () => {
  it('sends the guardrail system instruction with every request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Please ask about a ticket instead.' }] } }] })
    });

    await askAssistant({ message: 'what is the weather today?', runTool: jest.fn(), toolDeclarations: [] });

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sentBody.systemInstruction.parts[0].text).toMatch(/only answer questions about this organization/i);
  });

  it('executes a requested tool call and feeds the result back before answering', async () => {
    const runTool = jest.fn().mockResolvedValue({ totalMatching: 3 });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ functionCall: { name: 'getTicketSummary', args: {} } }] } }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'You have 3 tickets.' }] } }] })
      });

    const result = await askAssistant({
      message: 'how many tickets do I have?',
      runTool,
      toolDeclarations: [{ name: 'getTicketSummary' }]
    });

    expect(runTool).toHaveBeenCalledWith('getTicketSummary', {});
    expect(result.reply).toBe('You have 3 tickets.');
  });

  it('returns a safe fallback reply when the API call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await askAssistant({ message: 'hi', runTool: jest.fn(), toolDeclarations: [] });

    expect(result.reply).toMatch(/trouble reaching the ai service/i);
  });
});
