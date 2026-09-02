import { create } from 'zustand';

// Lets the Create Ticket / Ticket Detail pages hand their current title+description
// to the floating AiChatWidget (mounted once in Layout) without prop drilling.
// Cleared automatically when the widget re-checks the route it's on.
const useAiAssistantStore = create((set) => ({
    ticketContext: null, // { title, description } | null
    setTicketContext: (ctx) => set({ ticketContext: ctx }),
    clearTicketContext: () => set({ ticketContext: null }),
}));

export default useAiAssistantStore;
