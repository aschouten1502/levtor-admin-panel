'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackButtonsProps {
  logId: string | null;
  onFeedbackSubmitted?: (feedback: 'positive' | 'negative') => void;
}

export default function FeedbackButtons({ logId, onFeedbackSubmitted }: FeedbackButtonsProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (feedback: 'positive' | 'negative') => {
    if (!logId) {
      console.warn('Cannot submit feedback: no logId');
      return;
    }

    if (selectedFeedback) {
      // Feedback al gegeven
      return;
    }

    setSelectedFeedback(feedback);

    if (feedback === 'negative') {
      // Toon modal voor optionele comment
      setShowCommentModal(true);
    } else {
      // Direct versturen voor positive feedback
      await submitFeedback(feedback, null);
    }
  };

  const submitFeedback = async (feedback: 'positive' | 'negative', feedbackComment: string | null) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId,
          feedback,
          comment: feedbackComment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      console.log('✅ Feedback submitted successfully');
      onFeedbackSubmitted?.(feedback);
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      // Reset als het mislukt
      setSelectedFeedback(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSubmit = async () => {
    if (selectedFeedback === 'negative') {
      await submitFeedback('negative', comment || null);
      setShowCommentModal(false);
      setComment('');
    }
  };

  const handleModalSkip = async () => {
    if (selectedFeedback === 'negative') {
      await submitFeedback('negative', null);
      setShowCommentModal(false);
      setComment('');
    }
  };

  const handleModalClose = () => {
    setShowCommentModal(false);
    setComment('');
    setSelectedFeedback(null); // Reset feedback als modal wordt gesloten zonder verzenden
  };

  if (!logId) {
    return null; // Geen feedback buttons als er geen logId is
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => handleFeedback('positive')}
          disabled={selectedFeedback !== null || isSubmitting}
          className={`p-1.5 rounded-md transition-all ${
            selectedFeedback === 'positive'
              ? 'text-green-600 bg-green-50'
              : selectedFeedback === null
              ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Goed antwoord"
        >
          <ThumbsUp size={16} />
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          disabled={selectedFeedback !== null || isSubmitting}
          className={`p-1.5 rounded-md transition-all ${
            selectedFeedback === 'negative'
              ? 'text-red-600 bg-red-50'
              : selectedFeedback === null
              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Slecht antwoord"
        >
          <ThumbsDown size={16} />
        </button>
      </div>

      {/* Modal voor negatieve feedback */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Feedback
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Wat kunnen we verbeteren aan dit antwoord? (optioneel)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Typ hier je feedback..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleModalSubmit}
                disabled={isSubmitting || !comment.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isSubmitting ? 'Verzenden...' : 'Verstuur feedback'}
              </button>
              <button
                onClick={handleModalSkip}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed text-sm font-medium"
              >
                Overslaan
              </button>
              <button
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors disabled:text-gray-300 text-sm font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
