import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KidFriendlyDashboard } from '@/components/kid-friendly-dashboard';
import userEvent from '@testing-library/user-event';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Mock window.confirm
const originalConfirm = window.confirm;
beforeAll(() => {
  window.confirm = jest.fn();
});

afterAll(() => {
  window.confirm = originalConfirm;
});

describe('KidFriendlyDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with all memory cards', () => {
    render(<KidFriendlyDashboard locale="en" />);
    
    // Check that the header is visible
    expect(screen.getByText('Welcome to Your Memory Journal!')).toBeInTheDocument();
    
    // Check that memory cards are rendered (use a distinct content from the mock data)
    expect(screen.getByText('You like to code games with colorful characters')).toBeInTheDocument();
    expect(screen.getByText('Your favorite color is blue')).toBeInTheDocument();
    expect(screen.getByText('You\'re learning how to make websites')).toBeInTheDocument();
    
    // Check for memory buckets
    expect(screen.getByText('All Memories')).toBeInTheDocument();
    expect(screen.getByText('Fun Facts')).toBeInTheDocument();
    expect(screen.getByText('About Me')).toBeInTheDocument();
  });

  test('filters memories based on search query', async () => {
    render(<KidFriendlyDashboard locale="en" />);
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search your memories...');
    
    // Type a search term
    await userEvent.type(searchInput, 'code');
    
    // Check that only matching items are displayed
    expect(screen.getByText('You like to code games with colorful characters')).toBeInTheDocument();
    expect(screen.queryByText('Your favorite color is blue')).not.toBeInTheDocument();
  });

  test('filters memories based on selected bucket', async () => {
    render(<KidFriendlyDashboard locale="en" />);
    
    // Click on the "About Me" bucket
    const aboutMeButton = screen.getByText('About Me');
    fireEvent.click(aboutMeButton);
    
    // Check that only About Me items are displayed
    expect(screen.getByText('Your favorite color is blue')).toBeInTheDocument();
    expect(screen.queryByText('You like to code games with colorful characters')).not.toBeInTheDocument();
    
    // Click on "All Memories" to reset
    const allMemoriesButton = screen.getByText('All Memories');
    fireEvent.click(allMemoriesButton);
    
    // Check that all items are displayed again
    expect(screen.getByText('Your favorite color is blue')).toBeInTheDocument();
    expect(screen.getByText('You like to code games with colorful characters')).toBeInTheDocument();
  });

  test('toggles star on a memory', () => {
    render(<KidFriendlyDashboard locale="en" />);
    
    // Find a memory card with the specific content to test
    const memoryCard = screen.getByText('Your favorite color is blue').closest('.border');
    expect(memoryCard).not.toBeNull();
    
    if (memoryCard) {
      // Find the star button within this card
      const starButton = memoryCard.querySelector('button[aria-label="Star this memory"]');
      expect(starButton).not.toBeNull();
      
      if (starButton) {
        // Click to star it
        fireEvent.click(starButton);
        
        // Since we're testing implementation details (state changes), we'd need to assert on visible changes
        // For example, we might check if an aria attribute changed or a className was updated
        // This is an example, adjust to match how your component shows "starred" status
        expect(starButton).toHaveAttribute('aria-pressed', 'true');
      }
    }
  });

  test('deletes a memory when confirmed', () => {
    // Mock confirmation to return true
    (window.confirm as jest.Mock).mockReturnValueOnce(true);
    
    render(<KidFriendlyDashboard locale="en" />);
    
    // Get the text content to check after deletion
    const textToDelete = 'Your favorite color is blue';
    expect(screen.getByText(textToDelete)).toBeInTheDocument();
    
    // Find the memory card with this content
    const memoryCard = screen.getByText(textToDelete).closest('.border');
    expect(memoryCard).not.toBeNull();
    
    if (memoryCard) {
      // Find and click the delete button
      const deleteButton = memoryCard.querySelector('button[aria-label="Delete this memory"]');
      expect(deleteButton).not.toBeNull();
      
      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        // Check that the confirmation was called
        expect(window.confirm).toHaveBeenCalled();
        
        // Check that the memory was removed
        expect(screen.queryByText(textToDelete)).not.toBeInTheDocument();
      }
    }
  });

  test('cancels memory deletion when not confirmed', () => {
    // Mock confirmation to return false
    (window.confirm as jest.Mock).mockReturnValueOnce(false);
    
    render(<KidFriendlyDashboard locale="en" />);
    
    const textContent = 'You\'re learning how to make websites';
    expect(screen.getByText(textContent)).toBeInTheDocument();
    
    // Find and click a delete button
    const memoryCard = screen.getByText(textContent).closest('.border');
    if (memoryCard) {
      const deleteButton = memoryCard.querySelector('button[aria-label="Delete this memory"]');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        // Check that the confirmation was called
        expect(window.confirm).toHaveBeenCalled();
        
        // Check that the memory is still present
        expect(screen.getByText(textContent)).toBeInTheDocument();
      }
    }
  });

  test('adds a new memory', async () => {
    render(<KidFriendlyDashboard locale="en" />);
    
    // Open the "Add Memory" dialog
    const addButton = screen.getByText('Add New Memory');
    fireEvent.click(addButton);
    
    // Fill in the form
    const textarea = screen.getByPlaceholderText('Type your memory here...');
    await userEvent.type(textarea, 'This is a new test memory');
    
    // Submit the form
    const saveButton = screen.getByText('Save Memory');
    fireEvent.click(saveButton);
    
    // Check that the new memory appears in the list
    expect(screen.getByText('This is a new test memory')).toBeInTheDocument();
  });

  test('navigates to settings page when settings button is clicked', () => {
    const { useRouter } = require('next/navigation');
    const pushMock = jest.fn();
    useRouter.mockReturnValue({ push: pushMock });
    
    render(<KidFriendlyDashboard locale="en" />);
    
    // Find and click the settings button
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    // Check that router.push was called with the correct path
    expect(pushMock).toHaveBeenCalledWith('/en/mem0/settings');
  });
}); 