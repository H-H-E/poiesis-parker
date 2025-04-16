'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string; // Or name, depending on what the API returns
}

interface StudentSelectorProps {
  onStudentSelect: (userId: string | null) => void;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({ onStudentSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = event.target.value;
    const selectedId = userId === '' ? null : userId; // Handle 'Select a student' option
    setSelectedUserId(selectedId);
    onStudentSelect(selectedId);
  };

  if (isLoading) {
    return <p>Loading students...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading students: {error}</p>;
  }

  return (
    <div className="mb-4">
      <label htmlFor="student-select" className="mb-1 block text-sm font-medium text-gray-700">
        Select Student
      </label>
      <select
        id="student-select"
        value={selectedUserId || ''}
        onChange={handleSelectChange}
        className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
      >
        <option value="">-- Select a student --</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.email} {/* Display user email or name */}
          </option>
        ))}
      </select>
    </div>
  );
}; 