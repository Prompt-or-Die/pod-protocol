'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  StarIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'rating';
  rating?: number;
  message: string;
  userAgent: string;
  url: string;
  timestamp: number;
  userId?: string;
}

interface FeedbackWidgetProps {
  onSubmit?: (feedback: FeedbackData) => Promise<void>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  onSubmit,
  position = 'bottom-right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general' | 'rating'>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: ExclamationTriangleIcon, color: 'text-red-400' },
    { value: 'feature', label: 'Feature Request', icon: HandThumbUpIcon, color: 'text-blue-400' },
    { value: 'general', label: 'General Feedback', icon: ChatBubbleBottomCenterTextIcon, color: 'text-purple-400' },
    { value: 'rating', label: 'Rate Experience', icon: StarIcon, color: 'text-yellow-400' },
  ];

  const handleSubmit = async () => {
    if (!message.trim() && feedbackType !== 'rating') return;
    if (feedbackType === 'rating' && rating === 0) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      rating: feedbackType === 'rating' ? rating : undefined,
      message: message.trim(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };

    try {
      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        // Default: send to console or analytics
        console.log('Feedback submitted:', feedbackData);
      }
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage('');
        setRating(0);
        setFeedbackType('general');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Focus textarea after animation
    setTimeout(() => {
      if (textareaRef.current && feedbackType !== 'rating') {
        textareaRef.current.focus();
      }
    }, 300);
  };

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <AnimatePresence>
        {!isOpen ? (
          // Floating Action Button
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpen}
            className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center text-white transition-all duration-200 touch-manipulation"
          >
            <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
          </motion.button>
        ) : (
          // Feedback Form
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl w-80 max-w-[calc(100vw-2rem)]"
          >
            {submitted ? (
              // Success Message
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HandThumbUpIcon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Thank you!</h3>
                <p className="text-gray-400 text-sm">Your feedback helps us improve the experience.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Send Feedback</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors touch-manipulation"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Feedback Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      What type of feedback?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {feedbackTypes.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = feedbackType === type.value;
                        
                        return (
                          <button
                            key={type.value}
                            onClick={() => setFeedbackType(type.value as any)}
                            className={cn(
                              'p-3 rounded-lg border transition-all duration-200 text-left touch-manipulation',
                              isSelected 
                                ? 'border-purple-500/50 bg-purple-500/10 text-white' 
                                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-purple-500/30'
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <IconComponent className={cn('w-4 h-4', isSelected ? 'text-purple-400' : type.color)} />
                              <span className="text-xs font-medium">{type.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating (for rating type) */}
                  {feedbackType === 'rating' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        How would you rate your experience?
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const IconComponent = star <= rating ? StarIconSolid : StarIcon;
                          return (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors touch-manipulation"
                            >
                              <IconComponent className="w-6 h-6" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      {feedbackType === 'rating' ? 'Additional comments (optional)' : 'Your message'}
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        feedbackType === 'bug' 
                          ? 'Describe the bug you encountered...'
                          : feedbackType === 'feature'
                          ? 'Describe the feature you\'d like to see...'
                          : 'Share your thoughts with us...'
                      }
                      rows={3}
                      className="w-full p-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!message.trim() && feedbackType !== 'rating') || (feedbackType === 'rating' && rating === 0)}
                    className={cn(
                      'w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation',
                      'bg-purple-600 hover:bg-purple-700 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Send Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackWidget;