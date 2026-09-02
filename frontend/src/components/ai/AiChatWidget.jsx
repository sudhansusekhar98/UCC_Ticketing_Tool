import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { aiApi } from '../../services/api';
import useAiAssistantStore from '../../context/aiAssistantStore';
import './AiChatWidget.css';

const POSITION_KEY = 'aiChatWidgetPosition';
const DEFAULT_POSITION = { x: null, y: null }; // null = CSS default (bottom-right)

function loadPosition() {
    try {
        const raw = localStorage.getItem(POSITION_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_POSITION;
    } catch {
        return DEFAULT_POSITION;
    }
}

function clampToViewport(pos, el) {
    const w = el?.offsetWidth || 360;
    const h = el?.offsetHeight || 480;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.min(Math.max(8, pos.x), Math.max(8, maxX)), y: Math.min(Math.max(8, pos.y), Math.max(8, maxY)) };
}

// Gemini replies use **bold** markdown for emphasis (e.g. counts) — render it as
// actual bold instead of showing the literal asterisks. Nothing fancier needed.
function renderWithBold(text) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i}>{part.slice(2, -2)}</strong>
            : part
    );
}

const DRAG_THRESHOLD = 4; // px of movement before a mousedown counts as a drag, not a click

export default function AiChatWidget() {
    const { ticketContext } = useAiAssistantStore();
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(loadPosition);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const elRef = useRef(null); // bubble or window, whichever is currently mounted
    const dragState = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    // Reset the conversation when the ticket context changes (new ticket page).
    useEffect(() => {
        setMessages([]);
        setSuggestions(null);
    }, [ticketContext?.title, ticketContext?.description]);

    // Shared drag handling for both the collapsed bubble and the open window header.
    // A mousedown that never moves past the threshold is treated as a click instead
    // (so the bubble still opens on click while remaining draggable).
    const onDragStart = useCallback((e, onClick) => {
        const rect = elRef.current.getBoundingClientRect();
        dragState.current = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
            onClick,
        };
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }, []);

    const onDragMove = (e) => {
        const state = dragState.current;
        if (!state) return;
        if (!state.moved && (Math.abs(e.clientX - state.startX) > DRAG_THRESHOLD || Math.abs(e.clientY - state.startY) > DRAG_THRESHOLD)) {
            state.moved = true;
        }
        if (state.moved) {
            const next = clampToViewport({ x: e.clientX - state.offsetX, y: e.clientY - state.offsetY }, elRef.current);
            setPosition(next);
        }
    };

    const onDragEnd = () => {
        const state = dragState.current;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        dragState.current = null;
        if (!state) return;
        if (!state.moved) {
            state.onClick?.();
            return;
        }
        setPosition((pos) => {
            localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
            return pos;
        });
    };

    const fetchSuggestions = async () => {
        if (!ticketContext) return;
        setLoadingSuggestions(true);
        try {
            const { data } = await aiApi.suggest({
                title: ticketContext.title,
                description: ticketContext.description,
                category: ticketContext.category,
            });
            setSuggestions(data.data);
        } catch {
            setSuggestions({ steps: [], error: true });
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput('');
        const nextMessages = [...messages, { role: 'user', text }];
        setMessages(nextMessages);
        setSending(true);
        try {
            const { data } = await aiApi.chat({
                message: text,
                history: nextMessages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })),
                ticketContext: ticketContext || undefined,
            });
            setMessages((cur) => [...cur, { role: 'model', text: data.data.reply }]);
        } catch {
            setMessages((cur) => [...cur, { role: 'model', text: "Sorry, something went wrong. Please try again." }]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!open) {
        return (
            <button
                className="ai-widget-bubble"
                ref={elRef}
                style={position.x != null ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
                onMouseDown={(e) => onDragStart(e, () => setOpen(true))}
                title="Ask AI Assistant (drag to move)"
            >
                <Bot size={24} />
            </button>
        );
    }

    return (
        <div
            className="ai-widget-window"
            ref={elRef}
            style={position.x != null ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
        >
            <div className="ai-widget-header" onMouseDown={onDragStart}>
                <span className="ai-widget-title"><Bot size={16} /> TicketOps AI Assistant</span>
                <button className="ai-widget-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            {ticketContext && (
                <div className="ai-widget-suggestions">
                    {!suggestions && !loadingSuggestions && (
                        <button className="ai-widget-suggest-btn" onClick={fetchSuggestions}>
                            <Sparkles size={14} /> Get suggestions for this ticket
                        </button>
                    )}
                    {loadingSuggestions && <div className="ai-widget-loading"><Loader2 size={14} className="spin" /> Thinking...</div>}
                    {suggestions && !suggestions.error && (
                        <div className="ai-widget-suggestion-card">
                            {suggestions.suggestedCategory && (
                                <div><strong>Suggested category:</strong> {suggestions.suggestedCategory}{suggestions.suggestedSubCategory ? ` / ${suggestions.suggestedSubCategory}` : ''}</div>
                            )}
                            {suggestions.steps?.length > 0 && (
                                <ul>
                                    {suggestions.steps.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                    {suggestions?.error && <div className="ai-widget-loading">Couldn't get suggestions right now.</div>}
                </div>
            )}

            <div className="ai-widget-messages">
                {messages.length === 0 && (
                    <div className="ai-widget-empty">
                        Ask me about tickets, sites, assets, stock or RMAs you have access to.
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`ai-widget-msg ${m.role}`}>{renderWithBold(m.text)}</div>
                ))}
                {sending && <div className="ai-widget-msg model"><Loader2 size={14} className="spin" /></div>}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-widget-input-row">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    rows={1}
                />
                <button onClick={sendMessage} disabled={sending || !input.trim()}><Send size={16} /></button>
            </div>
        </div>
    );
}
