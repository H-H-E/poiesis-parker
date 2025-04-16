# Memory Admin Interface

This directory contains the implementation of the admin interface for managing student memory facts.

## Features

- **Student Selection**: Select a specific student to view and manage their memory facts
- **Filtering**: Filter facts by content, type, date range, confidence, and active status
- **CRUD Operations**: Create, read, update, and delete memory facts
- **Responsive Design**: Works on desktop and mobile devices

## Components

The admin memory interface is built using several components:

- **AdminMemoryPage**: Main page component that coordinates state and renders other components
- **StudentSelector**: Allows selecting a student to view their memory facts
- **AdminMemoryFilters**: Provides filtering options for memory facts
- **AdminFactList**: Displays a list of memory facts with pagination
- **AdminFactCard**: Displays a single memory fact with edit and delete options
- **FactEditModal**: Modal for creating and editing memory facts

## API Endpoints

The following API endpoints are used for managing memory facts:

### Get Student Memory Facts
- **Endpoint**: `/api/admin/getstudentmemory`
- **Method**: POST
- **Parameters**: 
  - `userId`: ID of the student to get facts for
  - Filtering options (query, factTypes, dates, etc.)
  - Pagination options (limit, offset)

### Create Student Fact
- **Endpoint**: `/api/admin/createstudentfact`
- **Method**: POST
- **Parameters**:
  - `user_id`: ID of the student to create the fact for
  - `content`: Content of the fact
  - `factType`: Type of fact
  - `confidence`: Optional confidence score (0-1)
  - `isActive`: Optional active status

### Update Student Fact
- **Endpoint**: `/api/admin/updatestudentfact`
- **Method**: POST
- **Parameters**:
  - `id`: ID of the fact to update
  - Updated fact properties (content, factType, etc.)

### Delete Student Fact
- **Endpoint**: `/api/admin/deletestudentfact`
- **Method**: POST
- **Parameters**:
  - `factId`: ID of the fact to delete

## Utilities

The admin memory interface uses several utility functions from `app/lib/memory/admin-utils.ts`:

- **handleApiError**: Handles API errors with consistent error messaging
- **formatDate**: Formats dates for display in the UI
- **getConfidenceLabel**: Gets a label for a confidence score
- **getConfidenceClasses**: Gets CSS classes for a confidence indicator
- **truncateText**: Truncates text with ellipsis

## Usage

1. Navigate to `/admin/memory` in the browser
2. Select a student from the dropdown
3. Use the filters to find specific facts
4. Click "Edit" or "Delete" on a fact to modify it
5. Click "Add New Fact" to create a new fact

## Future Improvements

- **Bulk Operations**: Add support for bulk editing and deleting facts
- **Advanced Filtering**: Add more advanced filtering options
- **Export/Import**: Add export and import functionality for memory facts
- **Analytics**: Add analytics for memory facts (e.g., fact type distribution, confidence trends)
- **AI Assistance**: Add AI assistance for creating and editing facts 