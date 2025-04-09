"use client"

import { useState } from "react"
import { Search, Plus, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data for memories
const mockMemories = [
  {
    id: "mem1",
    content: "Always use tabs for indentation in Python",
    type: "coding-preference",
    source: "chat on 2023-05-15",
    date: "2023-05-15T14:30:00",
    relevance: 0.9,
  },
  {
    id: "mem2",
    content: "User prefers dark mode in all applications",
    type: "user-preference",
    source: "settings analysis",
    date: "2023-04-10T09:15:00",
    relevance: 0.85,
  },
  {
    id: "mem3",
    content: "Project XYZ uses React with TypeScript",
    type: "project-data",
    source: "package.json analysis",
    date: "2023-06-01T11:20:00",
    relevance: 0.95,
  },
  {
    id: "mem4",
    content: "User prefers concise explanations over verbose ones",
    type: "communication-style",
    source: "chat pattern analysis",
    date: "2023-05-20T16:45:00",
    relevance: 0.8,
  },
  {
    id: "mem5",
    content: "Always import React in JSX files",
    type: "coding-preference",
    source: "code analysis",
    date: "2023-03-25T10:30:00",
    relevance: 0.7,
  },
]

export function CoreMemoryDashboard() {
  const [memories, setMemories] = useState(mockMemories)
  const [searchQuery, setSearchQuery] = useState("")
  const [newMemory, setNewMemory] = useState("")
  const [editingMemory, setEditingMemory] = useState<any>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null)

  const filteredMemories = memories.filter(
    (memory) =>
      memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.source.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddMemory = () => {
    if (newMemory.trim()) {
      const newMemoryObj = {
        id: `mem${memories.length + 1}`,
        content: newMemory,
        type: "manual-entry",
        source: "user input",
        date: new Date().toISOString(),
        relevance: 1.0,
      }
      setMemories([...memories, newMemoryObj])
      setNewMemory("")
      setIsAddDialogOpen(false)
    }
  }

  const handleEditMemory = () => {
    if (editingMemory && editingMemory.content.trim()) {
      setMemories(memories.map((mem) => (mem.id === editingMemory.id ? editingMemory : mem)))
      setIsEditDialogOpen(false)
    }
  }

  const handleDeleteMemory = () => {
    if (memoryToDelete) {
      setMemories(memories.filter((mem) => mem.id !== memoryToDelete))
      setMemoryToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleResetAllMemories = () => {
    if (confirm("Are you sure you want to delete ALL memories? This cannot be undone.")) {
      setMemories([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search memories..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Memory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Memory</DialogTitle>
                <DialogDescription>Enter the information you want Mem0 to remember.</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Enter memory content..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                className="min-h-[100px]"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMemory}>Save Memory</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={handleResetAllMemories}>
            <Trash2 className="mr-2 h-4 w-4" /> Reset All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Memory Scope & Permissions</CardTitle>
            <CardDescription>Control what Mem0 is allowed to remember</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="code-snippets">Remember Code Snippets</Label>
                <p className="text-sm text-muted-foreground">Store code patterns and preferences</p>
              </div>
              <Switch id="code-snippets" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="project-data">Project Data</Label>
                <p className="text-sm text-muted-foreground">Remember project-specific information</p>
              </div>
              <Switch id="project-data" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="chat-history">Chat History</Label>
                <p className="text-sm text-muted-foreground">Learn from our conversations</p>
              </div>
              <Switch id="chat-history" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="memory-scope">Memory Scope</Label>
                <p className="text-sm text-muted-foreground">Define where memories apply</p>
              </div>
              <Select defaultValue="global">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Projects)</SelectItem>
                  <SelectItem value="workspace">Current Workspace</SelectItem>
                  <SelectItem value="project">Current Project Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Stats</CardTitle>
            <CardDescription>Overview of your memory usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Memories</span>
                <Badge variant="secondary">{memories.length}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Coding Preferences</span>
                <Badge variant="secondary">{memories.filter((m) => m.type === "coding-preference").length}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">User Preferences</span>
                <Badge variant="secondary">{memories.filter((m) => m.type === "user-preference").length}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Project Data</span>
                <Badge variant="secondary">{memories.filter((m) => m.type === "project-data").length}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Manual Entries</span>
                <Badge variant="secondary">{memories.filter((m) => m.type === "manual-entry").length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Memories</TabsTrigger>
          <TabsTrigger value="coding">Coding Preferences</TabsTrigger>
          <TabsTrigger value="user">User Preferences</TabsTrigger>
          <TabsTrigger value="project">Project Data</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {filteredMemories.length > 0 ? (
              filteredMemories.map((memory) => (
                <Card key={memory.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <Badge variant="outline">{memory.type}</Badge>
                      <div className="flex gap-2">
                        <Dialog
                          open={isEditDialogOpen && editingMemory?.id === memory.id}
                          onOpenChange={(open) => !open && setIsEditDialogOpen(false)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingMemory(memory)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Memory</DialogTitle>
                              <DialogDescription>Update this memory's content or details.</DialogDescription>
                            </DialogHeader>
                            {editingMemory && (
                              <>
                                <Textarea
                                  value={editingMemory.content}
                                  onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                                  className="min-h-[100px]"
                                />
                                <Select
                                  value={editingMemory.type}
                                  onValueChange={(value) => setEditingMemory({ ...editingMemory, type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="coding-preference">Coding Preference</SelectItem>
                                    <SelectItem value="user-preference">User Preference</SelectItem>
                                    <SelectItem value="project-data">Project Data</SelectItem>
                                    <SelectItem value="communication-style">Communication Style</SelectItem>
                                    <SelectItem value="manual-entry">Manual Entry</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleEditMemory}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isDeleteDialogOpen && memoryToDelete === memory.id}
                          onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setMemoryToDelete(memory.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Memory</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this memory? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteMemory}>
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{memory.content}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                    <span>Source: {memory.source}</span>
                    <span>
                      {new Date(memory.date).toLocaleDateString()} • Relevance: {memory.relevance.toFixed(2)}
                    </span>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No memories found. Add some using the button above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coding" className="mt-4">
          <div className="space-y-4">
            {filteredMemories.filter((m) => m.type === "coding-preference").length > 0 ? (
              filteredMemories
                .filter((m) => m.type === "coding-preference")
                .map((memory) => (
                  <Card key={memory.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Badge variant="outline">{memory.type}</Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{memory.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                      <span>Source: {memory.source}</span>
                      <span>
                        {new Date(memory.date).toLocaleDateString()} • Relevance: {memory.relevance.toFixed(2)}
                      </span>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No coding preferences found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="user" className="mt-4">
          <div className="space-y-4">
            {filteredMemories.filter((m) => m.type === "user-preference").length > 0 ? (
              filteredMemories
                .filter((m) => m.type === "user-preference")
                .map((memory) => (
                  <Card key={memory.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Badge variant="outline">{memory.type}</Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{memory.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                      <span>Source: {memory.source}</span>
                      <span>
                        {new Date(memory.date).toLocaleDateString()} • Relevance: {memory.relevance.toFixed(2)}
                      </span>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No user preferences found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="project" className="mt-4">
          <div className="space-y-4">
            {filteredMemories.filter((m) => m.type === "project-data").length > 0 ? (
              filteredMemories
                .filter((m) => m.type === "project-data")
                .map((memory) => (
                  <Card key={memory.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Badge variant="outline">{memory.type}</Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{memory.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                      <span>Source: {memory.source}</span>
                      <span>
                        {new Date(memory.date).toLocaleDateString()} • Relevance: {memory.relevance.toFixed(2)}
                      </span>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No project data found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
