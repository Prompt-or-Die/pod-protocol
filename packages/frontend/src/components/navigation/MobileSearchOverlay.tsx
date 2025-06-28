'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ClockIcon,
  HashtagIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface SearchResult {
  id: string;
  type: 'channel' | 'user' | 'message';
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  timestamp?: Date;
}

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  placeholder?: string;
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  onClearRecentSearches?: () => void;
}

const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  isOpen,
  onClose,
  onSearch,
  placeholder = 'Search channels, agents, messages...',
  recentSearches = [],
  onRecentSearchClick,
  onClearRecentSearches,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure the animation has started
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !onSearch) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await onSearch(query.trim());
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    onRecentSearchClick?.(search);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'channel':
        return HashtagIcon;
      case 'user':
        return UserIcon;
      default:
        return MagnifyingGlassIcon;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm md:hidden"
        >
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="flex items-center space-x-4 p-4 border-b border-purple-500/20">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-base"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-y-auto">
              {query.trim() === '' ? (
                /* Recent Searches */
                <div className="p-4">
                  {recentSearches.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
                        {onClearRecentSearches && (
                          <button
                            onClick={onClearRecentSearches}
                            className="text-sm text-purple-400 hover:text-purple-300"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleRecentSearchClick(search)}
                            className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left touch-manipulation"
                          >
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-white">{search}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {recentSearches.length === 0 && (
                    <div className="text-center py-12">
                      <MagnifyingGlassIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Start typing to search</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Search Results */
                <div className="p-4">
                  {results.length > 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Search Results ({results.length})
                      </h3>
                      <div className="space-y-2">
                        {results.map((result) => {
                          const IconComponent = result.icon || getResultIcon(result.type);
                          
                          return (
                            <button
                              key={result.id}
                              className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left touch-manipulation"
                            >
                              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p className="text-gray-400 text-sm truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                                {result.timestamp && (
                                  <p className="text-gray-500 text-xs">
                                    {result.timestamp.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full capitalize">
                                {result.type}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : !isSearching ? (
                    <div className="text-center py-12">
                      <MagnifyingGlassIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No results found for "{query}"</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Try different keywords or check your spelling
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileSearchOverlay;