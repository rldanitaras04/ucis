'use client';

interface CarinaSuggestionsProps {
  roles: string[];
  onSelect: (suggestion: string) => void;
}

interface Suggestion {
  label: string;
  prompt: string;
}

function getSuggestions(roles: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (roles.length === 0 || roles.every(r => !['student', 'faculty', 'non_teaching_staff', 'clinic_staff', 'nurse', 'doctor', 'dentist', 'admin', 'super_admin'].includes(r))) {
    suggestions.push(
      { label: 'What services does the clinic provide?', prompt: 'What services does the clinic provide?' },
      { label: 'How do I use UCIS?', prompt: 'How do I use UCIS?' },
      { label: 'How can I contact the clinic?', prompt: 'How can I contact the clinic?' },
    );
    return suggestions;
  }

  if (roles.includes('student') || roles.includes('faculty') || roles.includes('non_teaching_staff')) {
    suggestions.push(
      { label: 'Show my clinic history', prompt: 'Show my clinic history' },
      { label: 'Check my clearance status', prompt: 'Check my clearance status' },
      { label: 'Show my FBS history', prompt: 'Show my FBS history' },
    );
  }

  if (roles.includes('doctor')) {
    suggestions.push(
      { label: 'Summarize my assigned patient', prompt: 'Summarize my assigned patient' },
      { label: 'Show recent vital trends', prompt: 'Show recent vital trends for a patient' },
      { label: 'Draft a clinical note', prompt: 'Help me draft a clinical note' },
    );
  }

  if (roles.includes('dentist')) {
    suggestions.push(
      { label: 'Summarize this dental history', prompt: 'Summarize this dental history' },
      { label: 'Show odontogram history', prompt: 'Show odontogram history for a patient' },
      { label: 'Draft a dental note', prompt: 'Help me draft a dental note' },
    );
  }

  if (roles.includes('nurse')) {
    suggestions.push(
      { label: "Show today's assigned queue", prompt: "Show today's assigned queue" },
      { label: 'Show follow-ups requiring attention', prompt: 'Show follow-ups requiring attention' },
      { label: 'Summarize assigned patients', prompt: 'Summarize my assigned patients' },
    );
  }

  if (roles.includes('clinic_staff')) {
    suggestions.push(
      { label: 'Add patient to queue', prompt: 'Add a patient to the queue' },
      { label: 'Call next patient', prompt: 'Call the next patient from the queue' },
      { label: 'Search patient by name', prompt: 'Search for a patient by name' },
    );
  }

  if (roles.includes('admin') || roles.includes('super_admin')) {
    suggestions.push(
      { label: "Show today's clinic statistics", prompt: "Show today's clinic statistics" },
      { label: 'Search patients', prompt: 'Search for a patient' },
      { label: 'Check medicine inventory', prompt: 'Check the medicine inventory' },
    );
  }

  return suggestions.slice(0, 3);
}

export default function CarinaSuggestions({ roles, onSelect }: CarinaSuggestionsProps) {
  const suggestions = getSuggestions(roles);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-[#E2E8F0]">
      <p className="text-xs text-[#64748B] mb-2">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion.prompt)}
            className="text-xs bg-[#EFF6FF] text-[#1E40AF] px-3 py-1.5 rounded-full hover:bg-[#DBEAFE] transition-colors border border-[#DBEAFE]"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
