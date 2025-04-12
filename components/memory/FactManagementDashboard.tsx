'use client';

import { useState, useEffect } from 'react';
import { 
  searchStudentFacts, 
  getFactsGroupedByTypeAndSubject,
  deactivateStudentFact,
  updateStudentFact,
  type StudentFact,
  type FactType
} from '@/lib/memory/fact-management';
import { useUser } from '@/lib/hooks/use-user';
import { supabase } from '@/lib/supabase/browser-client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Search, Filter, Tag, Edit, Trash } from 'lucide-react';

// Define the fact type colors for consistent styling
const factTypeColors: Record<FactType, string> = {
  preference: 'bg-blue-100 text-blue-800',
  struggle: 'bg-red-100 text-red-800',
  goal: 'bg-green-100 text-green-800',
  topic_interest: 'bg-purple-100 text-purple-800',
  learning_style: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function FactManagementDashboard() {
  const { user } = useUser();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchParams, setSearchParams] = useState({
    query: '',
    factTypes: [] as FactType[],
    includeInactive: false,
    limit: 20,
    offset: 0,
  });
  const [facts, setFacts] = useState<StudentFact[]>([]);
  const [groupedFacts, setGroupedFacts] = useState<Record<string, StudentFact[]>>({});
  const [totalFacts, setTotalFacts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [editingFact, setEditingFact] = useState<StudentFact | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  
  // Load students list (for admin)
  useEffect(() => {
    async function fetchStudents() {
      try {
        // This would fetch from your users table or a dedicated students table
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        setStudents(data || []);
        
        // If there are students and none is selected, select the first one
        if (data && data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    }
    
    fetchStudents();
  }, []);
  
  // Load facts when student or search params change
  useEffect(() => {
    if (!selectedStudentId) return;
    
    async function fetchFacts() {
      setIsLoading(true);
      try {
        // Fetch facts based on search parameters
        const result = await searchStudentFacts({
          userId: selectedStudentId,
          searchParams,
          client: supabase,
        });
        
        setFacts(result.facts);
        setTotalFacts(result.count);
        
        // Also fetch grouped facts for the categorized view
        const grouped = await getFactsGroupedByTypeAndSubject({
          userId: selectedStudentId,
          client: supabase,
        });
        
        setGroupedFacts(grouped);
      } catch (error) {
        console.error('Error fetching facts:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchFacts();
  }, [selectedStudentId, searchParams]);
  
  // Handle student selection change
  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    // Reset search when changing student
    setSearchParams({
      ...searchParams,
      query: '',
      offset: 0,
    });
  };
  
  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchParams({
      ...searchParams,
      query,
      offset: 0, // Reset pagination when search changes
    });
  };
  
  // Handle fact type filter change
  const handleFactTypeChange = (factType: FactType) => {
    const currentTypes = [...searchParams.factTypes];
    
    if (currentTypes.includes(factType)) {
      // Remove type if already selected
      setSearchParams({
        ...searchParams,
        factTypes: currentTypes.filter(type => type !== factType),
        offset: 0,
      });
    } else {
      // Add type if not selected
      setSearchParams({
        ...searchParams,
        factTypes: [...currentTypes, factType],
        offset: 0,
      });
    }
  };
  
  // Toggle including inactive facts
  const handleInactiveToggle = (checked: boolean) => {
    setSearchParams({
      ...searchParams,
      includeInactive: checked,
      offset: 0,
    });
  };
  
  // Handle pagination
  const handleNextPage = () => {
    if (facts.length < searchParams.limit) return; // No more results
    
    setSearchParams({
      ...searchParams,
      offset: searchParams.offset + searchParams.limit,
    });
  };
  
  const handlePrevPage = () => {
    if (searchParams.offset === 0) return; // Already at first page
    
    setSearchParams({
      ...searchParams,
      offset: Math.max(0, searchParams.offset - searchParams.limit),
    });
  };
  
  // Handle fact editing (open edit form)
  const handleEditFact = (fact: StudentFact) => {
    setEditingFact(fact);
  };
  
  // Handle fact update
  const handleUpdateFact = async (factId: string, updates: Partial<StudentFact>) => {
    if (!factId) return;
    
    try {
      await updateStudentFact({
        factId,
        updates,
        client: supabase,
      });
      
      // Refresh facts after update
      setSearchParams({ ...searchParams });
      setEditingFact(null);
    } catch (error) {
      console.error('Error updating fact:', error);
    }
  };
  
  // Handle fact deactivation
  const handleDeactivateFact = async (factId: string) => {
    if (!factId) return;
    
    try {
      await deactivateStudentFact({
        factId,
        client: supabase,
      });
      
      // Refresh facts after deactivation
      setSearchParams({ ...searchParams });
    } catch (error) {
      console.error('Error deactivating fact:', error);
    }
  };
  
  // Render loading state
  if (isLoading && facts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading facts...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Student Fact Management</h1>
      
      {/* Student selector for admins */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Student</label>
        <Select value={selectedStudentId} onValueChange={handleStudentChange}>
          <SelectTrigger className="w-full md:w-1/3">
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(student => (
              <SelectItem key={student.id} value={student.id}>
                {student.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedStudentId && (
        <Tabs defaultValue="list-view" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list-view">List View</TabsTrigger>
            <TabsTrigger value="categorized">Categorized View</TabsTrigger>
          </TabsList>
          
          {/* List View Tab */}
          <TabsContent value="list-view" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Facts</CardTitle>
                <CardDescription>
                  Manage and explore all facts recorded for this student.
                </CardDescription>
                
                {/* Search and filter controls */}
                <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search facts..."
                      className="pl-8"
                      value={searchParams.query}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Fact Types
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="p-2">
                        {(['preference', 'struggle', 'goal', 'topic_interest', 'learning_style', 'other'] as FactType[]).map((type) => (
                          <div key={type} className="flex items-center space-x-2 p-1">
                            <Checkbox 
                              id={`filter-${type}`} 
                              checked={searchParams.factTypes.includes(type)}
                              onCheckedChange={() => handleFactTypeChange(type)}
                            />
                            <label
                              htmlFor={`filter-${type}`}
                              className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-inactive" 
                      checked={searchParams.includeInactive}
                      onCheckedChange={handleInactiveToggle}
                    />
                    <label
                      htmlFor="show-inactive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Inactive Facts
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Type</TableHead>
                        <TableHead className="w-32">Subject</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No facts found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        facts.map((fact) => (
                          <TableRow key={fact.id}>
                            <TableCell>
                              <Badge className={factTypeColors[fact.fact_type]}>
                                {fact.fact_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{fact.subject || '-'}</TableCell>
                            <TableCell>{fact.details}</TableCell>
                            <TableCell>
                              {fact.active === false ? (
                                <Badge variant="outline" className="bg-gray-100">Inactive</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditFact(fact)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  {fact.active !== false && (
                                    <DropdownMenuItem 
                                      onClick={() => fact.id && handleDeactivateFact(fact.id)}
                                      className="text-red-600"
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {facts.length > 0 ? searchParams.offset + 1 : 0} to{' '}
                    {searchParams.offset + facts.length} of {totalFacts} facts
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={searchParams.offset === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={facts.length < searchParams.limit}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Categorized View Tab */}
          <TabsContent value="categorized" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Facts by Category</CardTitle>
                <CardDescription>
                  View student facts organized by type and subject.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {Object.entries(groupedFacts).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No facts available for categorized view.
                    </div>
                  ) : (
                    Object.entries(groupedFacts).map(([category, categoryFacts]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="text-lg font-semibold capitalize">
                          {category.includes(':') 
                            ? `${category.split(':')[0].replace('_', ' ')} - ${category.split(':')[1]}`
                            : category.replace('_', ' ')}
                        </h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-32">Confidence</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryFacts.map((fact) => (
                                <TableRow key={fact.id}>
                                  <TableCell>{fact.details}</TableCell>
                                  <TableCell>{fact.confidence || '-'}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditFact(fact)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Edit fact modal */}
      {editingFact && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Fact</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fact Type</label>
                <Select 
                  defaultValue={editingFact.fact_type}
                  onValueChange={(value) => setEditingFact({...editingFact, fact_type: value as FactType})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="struggle">Struggle</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="topic_interest">Topic Interest</SelectItem>
                    <SelectItem value="learning_style">Learning Style</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input 
                  value={editingFact.subject || ''} 
                  onChange={(e) => setEditingFact({...editingFact, subject: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Details</label>
                <Input 
                  value={editingFact.details} 
                  onChange={(e) => setEditingFact({...editingFact, details: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Confidence</label>
                <Input 
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingFact.confidence?.toString() || ''} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEditingFact({...editingFact, confidence: isNaN(val) ? null : val})
                  }}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="fact-active" 
                  checked={editingFact.active !== false}
                  onCheckedChange={(checked) => setEditingFact({
                    ...editingFact, 
                    active: checked === true
                  })}
                />
                <label
                  htmlFor="fact-active"
                  className="text-sm font-medium leading-none"
                >
                  Active
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingFact(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingFact.id) {
                  const { id, user_id, created_at, updated_at, ...updates } = editingFact;
                  handleUpdateFact(id, updates);
                }
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 