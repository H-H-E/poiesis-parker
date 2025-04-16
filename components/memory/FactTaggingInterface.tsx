'use client';

import { useState, useEffect } from 'react';
import { 
  updateFactTags,
  getAllFactTags,
  getFactsByTags,
  type StudentFact
} from '@/lib/memory/fact-management';
import { supabase } from '@/lib/supabase/browser-client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, X, Tag, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type FactTaggingInterfaceProps = {
  userId: string;
  factId?: string; // Optional - if provided, only shows tags for this fact
  onTagsUpdated?: (tags: string[]) => void; // Optional callback when tags are updated
};

export default function FactTaggingInterface({ 
  userId, 
  factId,
  onTagsUpdated 
}: FactTaggingInterfaceProps) {
  const { toast } = useToast();
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [fact, setFact] = useState<StudentFact | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  
  // Load available tags and current tags for the fact (if factId is provided)
  useEffect(() => {
    async function loadData() {
      setIsLoadingTags(true);
      try {
        // Load all available tags
        const allTags = await getAllFactTags({
          userId,
          client: supabase,
        });
        
        setAvailableTags(allTags);
        
        // If a specific fact is specified, load its tags
        if (factId) {
          const factsByTag = await getFactsByTags({
            userId,
            tags: [], // Empty to get all facts, we'll filter by ID
            client: supabase,
          });
          
          const targetFact = factsByTag.find(f => f.id === factId);
          if (targetFact) {
            setFact(targetFact);
            setSelectedTags(targetFact.tags || []);
          }
        }
      } catch (error) {
        console.error('Error loading tags:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tags. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTags(false);
      }
    }
    
    loadData();
  }, [userId, factId, toast]);
  
  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    
    // Normalize the tag (lowercase, no spaces)
    const normalizedTag = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Skip if tag already exists in selected tags
    if (selectedTags.includes(normalizedTag)) {
      setNewTagInput('');
      return;
    }
    
    // Add to selected tags
    const updatedTags = [...selectedTags, normalizedTag];
    setSelectedTags(updatedTags);
    
    // Add to available tags if it's a new tag
    if (!availableTags.includes(normalizedTag)) {
      setAvailableTags([...availableTags, normalizedTag]);
    }
    
    // Clear input
    setNewTagInput('');
    
    // Update the fact if a specific factId is provided
    if (factId) {
      await updateTagsForFact(updatedTags);
    }
    
    // Trigger callback if provided
    if (onTagsUpdated) {
      onTagsUpdated(updatedTags);
    }
  };
  
  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    
    // Update the fact if a specific factId is provided
    if (factId) {
      await updateTagsForFact(updatedTags);
    }
    
    // Trigger callback if provided
    if (onTagsUpdated) {
      onTagsUpdated(updatedTags);
    }
  };
  
  // Handle selecting an existing tag
  const handleSelectTag = async (tag: string, isChecked: boolean) => {
    let updatedTags: string[];
    
    if (isChecked) {
      // Add tag if it's not already selected
      updatedTags = selectedTags.includes(tag) 
        ? selectedTags 
        : [...selectedTags, tag];
    } else {
      // Remove tag
      updatedTags = selectedTags.filter(t => t !== tag);
    }
    
    setSelectedTags(updatedTags);
    
    // Update the fact if a specific factId is provided
    if (factId) {
      await updateTagsForFact(updatedTags);
    }
    
    // Trigger callback if provided
    if (onTagsUpdated) {
      onTagsUpdated(updatedTags);
    }
  };
  
  // Update tags for a specific fact
  const updateTagsForFact = async (tags: string[]) => {
    if (!factId) return;
    
    setIsLoading(true);
    try {
      await updateFactTags({
        factId,
        tags,
        client: supabase,
      });
      
      toast({
        title: 'Tags updated',
        description: 'The tags have been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tags. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter available tags based on search input
  const filteredAvailableTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(tagFilter.toLowerCase()) &&
    !selectedTags.includes(tag)
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="size-5" />
          {factId ? 'Fact Tags' : 'Tag Management'}
        </CardTitle>
        <CardDescription>
          {factId 
            ? 'Add or remove tags to categorize this fact'
            : 'Create and manage tags to organize facts'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Fact details if a specific fact is being tagged */}
        {fact && (
          <div className="rounded-md bg-gray-50 p-3">
            <h3 className="mb-1 text-sm font-medium text-gray-700">Fact Details</h3>
            <p className="text-sm">{fact.details}</p>
          </div>
        )}
        
        {/* Currently selected tags */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Selected Tags</h3>
          <div className="flex flex-wrap gap-2">
            {selectedTags.length === 0 ? (
              <p className="text-sm text-gray-500">No tags selected</p>
            ) : (
              selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove ${tag} tag`}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
        
        {/* Add new tag */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Add New Tag</h3>
          <div className="flex gap-2">
            <div className="relative grow">
              <Input
                placeholder="Enter new tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleAddTag} 
              size="sm"
              disabled={!newTagInput.trim() || isLoading}
            >
              <PlusCircle className="mr-1 size-4" />
              Add
            </Button>
          </div>
        </div>
        
        {/* Available tags */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Available Tags</h3>
            
            {/* Tag filter */}
            <div className="relative max-w-xs">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Filter tags..."
                className="h-8 pl-8 text-sm"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
            </div>
          </div>
          
          {isLoadingTags ? (
            <div className="py-4 text-center">
              <div className="mx-auto size-6 animate-spin rounded-full border-b-2 border-gray-500"></div>
              <p className="mt-2 text-sm text-gray-500">Loading tags...</p>
            </div>
          ) : filteredAvailableTags.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">
              {tagFilter 
                ? 'No matching tags found' 
                : 'No additional tags available'}
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredAvailableTags.map(tag => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={(checked) => 
                      handleSelectTag(tag, checked === true)
                    }
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 