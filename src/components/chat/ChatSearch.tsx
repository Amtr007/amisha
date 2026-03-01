import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { SearchMessageResult } from '../../types/database';
import { searchMessagesInChat } from '../../services/messaging';

interface ChatSearchProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

export function ChatSearch({ conversationId, isOpen, onClose, onNavigateToMessage }: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMessageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      const data = await searchMessagesInChat(conversationId, query);
      setResults(data);
      setCurrentIndex(0);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, conversationId]);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const goToPrevious = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    setCurrentIndex(newIndex);
    onNavigateToMessage(results[newIndex].id);
  };

  const goToNext = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onNavigateToMessage(results[newIndex].id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevious();
      } else {
        goToNext();
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3 z-10 shadow-sm">
      <Search size={18} className="text-gray-400 flex-shrink-0" />

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in conversation..."
        className="flex-1 bg-transparent outline-none text-sm"
      />

      {isSearching && (
        <div className="animate-spin w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full" />
      )}

      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {currentIndex + 1} of {results.length}
          </span>

          <button
            onClick={goToPrevious}
            className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowUp size={16} />
          </button>

          <button
            onClick={goToNext}
            className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      )}

      {query && results.length === 0 && !isSearching && (
        <span className="text-xs text-gray-500">No results</span>
      )}

      <button
        onClick={handleClose}
        className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
