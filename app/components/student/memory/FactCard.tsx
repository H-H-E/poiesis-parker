import { formatDistanceToNow } from 'date-fns';
import type { Fact, FeedbackType } from './types';
import { FeedbackButtons } from './FeedbackButtons';

interface FactCardProps {
  fact: Fact;
  onFeedback: (factId: string, feedbackType: FeedbackType) => Promise<void>;
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onFeedback }) => {
  const formattedDate = formatDistanceToNow(new Date(fact.updatedAt), { addSuffix: true });
  
  // Get appropriate styling based on fact type
  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'personal':
        return 'bg-blue-100 text-blue-800';
      case 'preference':
        return 'bg-purple-100 text-purple-800';
      case 'concept':
        return 'bg-green-100 text-green-800';
      case 'session':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="mb-4 rounded-lg border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <span className={`rounded-full px-2 py-1 text-xs ${getTypeStyle(fact.factType)}`}>
          {fact.factType}
        </span>
        <span className="text-xs text-gray-500">
          Updated {formattedDate}
        </span>
      </div>
      
      <p className="mb-3 text-gray-800">{fact.content}</p>
      
      {fact.originContext && (
        <div className="mb-2 text-xs text-gray-500">
          <span className="italic">Source: {fact.originContext}</span>
        </div>
      )}
      
      <FeedbackButtons factId={fact.id} onFeedback={onFeedback} />
    </div>
  );
}; 