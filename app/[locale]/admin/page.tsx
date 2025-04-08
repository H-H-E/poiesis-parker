"use client"
export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { ModelsUpdatePayload } from "@/types/model-perm-update"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Search,
  UserCircle,
  FileText,
  Sparkles
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"

type User = {
  user_id: string
  username: string
  permitted_models: string[]
}

type Prompt = {
  id: string
  name: string
  content: string
  is_global: boolean
  created_at: string
  updated_at: string
  user_id: string
}

type Workspace = {
  id: string
  name: string
  admin_prompt: string | null
}

const AdminPage = () => {
  const [selectedModels, setSelectedModels] = useState<{
    [key: string]: string[]
  }>({})
  const [users, setUsers] = useState<User[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("")
  const [adminPrompt, setAdminPrompt] = useState<string>("")
  const [studentSystemPrompt, setStudentSystemPrompt] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [newPrompt, setNewPrompt] = useState<{
    name: string
    content: string
    is_global: boolean
  }>({
    name: "",
    content: "",
    is_global: true
  })
  const [openUsers, setOpenUsers] = useState<{ [key: string]: boolean }>({})
  const [openPrompts, setOpenPrompts] = useState<{ [key: string]: boolean }>({})
  const [collapseAll, setCollapseAll] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchUsers(),
          fetchPrompts(),
          fetchWorkspaces(),
          fetchGlobalSettings()
        ])
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/getusers")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users)
      // Initialize selectedModels with the permitted models for each user
      const initialSelectedModels = data.users.reduce(
        (acc: { [key: string]: string[] }, user: User) => {
          acc[user.user_id] = user.permitted_models
          return acc
        },
        {}
      )
      setSelectedModels(initialSelectedModels)
      // Initialize all users as collapsed except the first one
      if (data.users.length > 0) {
        const initialOpenState = data.users.reduce(
          (acc: { [key: string]: boolean }, user: User, index: number) => {
            acc[user.user_id] = index === 0 // Open first user by default
            return acc
          },
          {}
        )
        setOpenUsers(initialOpenState)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/admin/getprompts")
      if (!response.ok) {
        throw new Error("Failed to fetch prompts")
      }
      const data = await response.json()
      setPrompts(data.prompts)
      // Initialize all prompts as collapsed
      if (data.prompts.length > 0) {
        const initialOpenState = data.prompts.reduce(
          (acc: { [key: string]: boolean }, prompt: Prompt) => {
            acc[prompt.id] = false
            return acc
          },
          {}
        )
        setOpenPrompts(initialOpenState)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/admin/getworkspaces")
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces")
      }
      const data = await response.json()
      setWorkspaces(data.workspaces)
      if (data.workspaces.length > 0) {
        setSelectedWorkspace(data.workspaces[0].id)
        setAdminPrompt(data.workspaces[0].admin_prompt || "")
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const fetchGlobalSettings = async () => {
    try {
      const response = await fetch("/api/admin/global-settings")
      if (!response.ok) {
        throw new Error("Failed to fetch global settings")
      }
      const data = await response.json()
      setStudentSystemPrompt(data.settings.student_system_prompt || "")
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleModelChange = (userId: string, modelId: string) => {
    setSelectedModels((prevSelectedModels: { [key: string]: string[] }) => {
      const currentSelection = prevSelectedModels[userId] || []
      if (currentSelection.includes(modelId)) {
        return {
          ...prevSelectedModels,
          [userId]: currentSelection.filter(id => id !== modelId)
        }
      }
      return {
        ...prevSelectedModels,
        [userId]: [...currentSelection, modelId]
      }
    })
  }

  const handleSaveModels = async () => {
    setIsLoading(true)
    const payload: ModelsUpdatePayload = {
      updates: users.map(user => ({
        userId: user.user_id,
        modelIds: selectedModels[user.user_id] || []
      }))
    }

    try {
      const response = await fetch("/api/admin/setmodelsforusers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error("Failed to update model permissions")
      }

      const responseData = await response.json()
      console.log(responseData.message)
      // Update the state to reflect the changes
      setUsers(
        users.map(user => ({
          ...user,
          permitted_models: selectedModels[user.user_id] || []
        }))
      )
      toast({
        title: "Success",
        description: "Model access permissions have been updated.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save model permissions. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/createprompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newPrompt)
      })

      if (!response.ok) {
        throw new Error("Failed to create prompt")
      }

      const data = await response.json()
      setPrompts([...prompts, data.prompt])
      setNewPrompt({
        name: "",
        content: "",
        is_global: true
      })
      toast({
        title: "Success",
        description: "New prompt created successfully.",
        variant: "default"
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to create prompt. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/deleteprompt?id=${promptId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete prompt")
      }

      setPrompts(prompts.filter(prompt => prompt.id !== promptId))
      toast({
        title: "Success",
        description: "Prompt deleted successfully.",
        variant: "default"
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkspaceChange = (value: string) => {
    setSelectedWorkspace(value)
    const workspace = workspaces.find(w => w.id === value)
    setAdminPrompt(workspace?.admin_prompt || "")
  }

  const handleSaveAdminPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkspace) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/setworkspaceadminprompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId: selectedWorkspace,
          adminPrompt
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update admin prompt")
      }

      // Update the workspaces state with the new admin prompt
      setWorkspaces(
        workspaces.map(workspace =>
          workspace.id === selectedWorkspace
            ? { ...workspace, admin_prompt: adminPrompt }
            : workspace
        )
      )

      toast({
        title: "Success",
        description: "Admin prompt updated successfully!",
        variant: "default"
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update admin prompt. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveStudentSystemPrompt = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/global-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_system_prompt: studentSystemPrompt
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update student system prompt")
      }

      toast({
        title: "Success",
        description: "Student system prompt updated successfully!",
        variant: "default"
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description:
          "Failed to update student system prompt. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter prompts by search query
  const filteredPrompts = prompts.filter(
    prompt =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleUserCollapse = (userId: string) => {
    setOpenUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const togglePromptCollapse = (promptId: string) => {
    setOpenPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }))
  }

  const toggleAllUsers = (expanded: boolean) => {
    const newState = filteredUsers.reduce(
      (acc: { [key: string]: boolean }, user: User) => {
        acc[user.user_id] = expanded
        return acc
      },
      {}
    )
    setOpenUsers(newState)
    setCollapseAll(!expanded)
  }

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, prompts, and system settings
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <UserCircle className="size-4" />
            <span>User Access</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <FileText className="size-4" />
            <span>Prompts</span>
          </TabsTrigger>
          <TabsTrigger
            value="workspace-prompts"
            className="flex items-center gap-2"
          >
            <Sparkles className="size-4" />
            <span>Workspace Prompts</span>
          </TabsTrigger>
          <TabsTrigger
            value="student-system-prompt"
            className="flex items-center gap-2"
          >
            <AlertCircle className="size-4" />
            <span>Student System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>User Model Access</CardTitle>
              <CardDescription>
                Control which AI models each user can access in the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <Alert className="mb-4">
                  <AlertCircle className="size-4" />
                  <AlertTitle>No users found</AlertTitle>
                  <AlertDescription>
                    {searchQuery
                      ? "No users match your search query"
                      : "There are no users to display"}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllUsers(!collapseAll)}
                      className="text-xs"
                    >
                      {collapseAll ? (
                        <>
                          <ChevronDown className="mr-1 size-4" />
                          Expand All
                        </>
                      ) : (
                        <>
                          <ChevronUp className="mr-1 size-4" />
                          Collapse All
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {filteredUsers.map(user => (
                      <Collapsible
                        key={user.user_id}
                        open={openUsers[user.user_id]}
                        onOpenChange={() => toggleUserCollapse(user.user_id)}
                        className="rounded-lg border"
                      >
                        <div className="hover:bg-accent/50 flex cursor-pointer items-center justify-between rounded-t-lg p-4">
                          <div className="flex items-center gap-2">
                            <UserCircle className="size-5" />
                            <h3 className="text-lg font-medium">
                              {user.username}
                            </h3>
                            <Badge variant="outline" className="ml-2">
                              {selectedModels[user.user_id]?.length || 0} models
                            </Badge>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {openUsers[user.user_id] ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="border-t p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                              {LLM_LIST.map(llm => (
                                <div
                                  key={llm.modelId}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`${user.user_id}-${llm.modelId}`}
                                    checked={selectedModels[
                                      user.user_id
                                    ]?.includes(llm.modelId)}
                                    onCheckedChange={() =>
                                      handleModelChange(
                                        user.user_id,
                                        llm.modelId
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`${user.user_id}-${llm.modelId}`}
                                    className={`cursor-pointer text-sm ${selectedModels[user.user_id]?.includes(llm.modelId) ? "font-medium" : ""}`}
                                  >
                                    {llm.modelName}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveModels} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add New Prompt</CardTitle>
                <CardDescription>
                  Create a new prompt template for users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id="new-prompt-form"
                  onSubmit={handlePromptSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="prompt-name">Prompt Name</Label>
                    <Input
                      id="prompt-name"
                      placeholder="Enter prompt name..."
                      value={newPrompt.name}
                      onChange={e =>
                        setNewPrompt({ ...newPrompt, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompt-content">Prompt Content</Label>
                    <Textarea
                      id="prompt-content"
                      placeholder="Enter prompt content..."
                      value={newPrompt.content}
                      onChange={e =>
                        setNewPrompt({ ...newPrompt, content: e.target.value })
                      }
                      className="min-h-[150px]"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prompt-global"
                      checked={newPrompt.is_global}
                      onCheckedChange={checked =>
                        setNewPrompt({
                          ...newPrompt,
                          is_global: checked as boolean
                        })
                      }
                    />
                    <Label htmlFor="prompt-global">
                      Make globally available to all users
                    </Label>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  form="new-prompt-form"
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Creating..." : "Create Prompt"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Prompts</CardTitle>
                <CardDescription>
                  Manage prompt templates available in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[550px] overflow-y-auto">
                {filteredPrompts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No prompts match your search query"
                        : "No prompts available yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPrompts.map(prompt => (
                      <Collapsible
                        key={prompt.id}
                        open={openPrompts[prompt.id]}
                        onOpenChange={() => togglePromptCollapse(prompt.id)}
                        className="rounded-lg border"
                      >
                        <div className="hover:bg-accent/50 flex cursor-pointer items-center justify-between rounded-t-lg p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4" />
                            <h3 className="font-medium">{prompt.name}</h3>
                            <Badge
                              variant={prompt.is_global ? "default" : "outline"}
                              className="ml-1"
                            >
                              {prompt.is_global ? "Global" : "Limited"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {new Date(prompt.updated_at).toLocaleDateString()}
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeletePrompt(prompt.id)
                              }}
                              disabled={isLoading}
                            >
                              Delete
                            </Button>
                            <CollapsibleTrigger
                              asChild
                              onClick={e => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm">
                                {openPrompts[prompt.id] ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <CollapsibleContent>
                          <div className="border-t p-4 pt-2">
                            <pre className="text-muted-foreground whitespace-pre-wrap text-sm">
                              {prompt.content}
                            </pre>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workspace-prompts">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Admin Prompts</CardTitle>
              <CardDescription>
                Configure prompts that apply to all chats in a specific
                workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="workspace-prompt-form"
                onSubmit={handleSaveAdminPrompt}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="workspace-select">Select Workspace</Label>
                  <Select
                    value={selectedWorkspace}
                    onValueChange={handleWorkspaceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map(workspace => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-prompt">
                    Admin Prompt
                    <span className="text-muted-foreground ml-2 text-sm">
                      (Applied to all chats in this workspace)
                    </span>
                  </Label>
                  <Textarea
                    id="admin-prompt"
                    placeholder="Enter administrative prompt instructions here. These will be prepended to all prompts in this workspace and will take precedence over user settings."
                    value={adminPrompt}
                    onChange={e => setAdminPrompt(e.target.value)}
                    className="min-h-[250px]"
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-muted-foreground flex items-center text-sm">
                <InfoCard title="About Admin Prompts">
                  <p>
                    Admin prompts are prepended to all chats in a workspace,
                    taking precedence over user-defined prompts.
                  </p>
                  <p className="mt-2">Use this feature to:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Enforce age-appropriate content filtering</li>
                    <li>Set educational standards and preferences</li>
                    <li>Create a consistent response style</li>
                    <li>
                      Add specific instructions that can&apos;t be overridden
                    </li>
                  </ul>
                </InfoCard>
              </div>
              <Button
                form="workspace-prompt-form"
                type="submit"
                disabled={isLoading || !selectedWorkspace}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="student-system-prompt">
          <Card>
            <CardHeader>
              <CardTitle>Global Student System Prompt</CardTitle>
              <CardDescription>
                Set a system prompt that will be applied to all student
                interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="student-system-form"
                onSubmit={handleSaveStudentSystemPrompt}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="student-system-prompt">
                    Student System Prompt
                    <span className="text-muted-foreground ml-2 text-sm">
                      (Applied to all students)
                    </span>
                  </Label>
                  <Textarea
                    id="student-system-prompt"
                    placeholder="Enter instructions that will be applied to all student interactions. This prompt will be included in all conversations with students."
                    value={studentSystemPrompt}
                    onChange={e => setStudentSystemPrompt(e.target.value)}
                    className="min-h-[250px]"
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-muted-foreground flex items-center text-sm">
                <InfoCard title="About Student System Prompt">
                  <p>
                    The student system prompt is applied globally to all student
                    interactions across all workspaces.
                  </p>
                  <p className="mt-2">Use this feature to:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Apply consistent educational guidelines</li>
                    <li>Add learning support instructions</li>
                    <li>Include age-appropriate content filters</li>
                    <li>Enable specific educational features</li>
                  </ul>
                </InfoCard>
              </div>
              <Button
                form="student-system-form"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for info cards
function InfoCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Alert className="max-w-md">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 text-xs">{children}</AlertDescription>
    </Alert>
  )
}

export default AdminPage
