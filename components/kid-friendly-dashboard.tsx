"use client"

import { useState } from "react"
import { Search, Star, Trash2, BookOpen, Archive, Lock, Gift, Clock, Sparkles, Settings, Palette, Gamepad2, User, Lightbulb, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Mock data for kid-friendly memories
const mockMemories = [
  {
    id: "kid1",
    content: "You like to code games with colorful characters",
    type: "Fun Facts",
    icon: <Gamepad2 className="h-5 w-5 text-purple-600" />,
    color: "bg-purple-100 border-purple-300",
    textColor: "text-purple-800",
    isStarred: true,
    date: "2023-05-15T14:30:00",
  },
  {
    id: "kid2",
    content: "Your favorite color is blue",
    type: "About Me",
    icon: <Palette className="h-5 w-5 text-blue-600" />,
    color: "bg-blue-100 border-blue-300",
    textColor: "text-blue-800",
    isStarred: false,
    date: "2023-04-10T09:15:00",
  },
  {
    id: "kid3",
    content: "You're learning how to make websites",
    type: "Learning",
    icon: <Lightbulb className="h-5 w-5 text-green-600" />,
    color: "bg-green-100 border-green-300",
    textColor: "text-green-800",
    isStarred: true,
    date: "2023-06-01T11:20:00",
  },
  {
    id: "kid4",
    content: "You like to explain things step by step",
    type: "How I Help",
    icon: <User className="h-5 w-5 text-yellow-600" />,
    color: "bg-yellow-100 border-yellow-300",
    textColor: "text-yellow-800",
    isStarred: false,
    date: "2023-05-20T16:45:00",
  },
  {
    id: "kid5",
    content: "You're working on a story about space explorers",
    type: "Projects",
    icon: <Rocket className="h-5 w-5 text-red-600" />,
    color: "bg-red-100 border-red-300",
    textColor: "text-red-800",
    isStarred: false,
    date: "2023-03-25T10:30:00",
  },
]

// Memory bucket categories
const memoryBuckets = [
  { id: "fun-facts", name: "Fun Facts", icon: <Gamepad2 className="h-5 w-5 text-purple-600" />, color: "bg-purple-100", activeColor: "bg-purple-200", textColor: "text-purple-700" },
  { id: "about-me", name: "About Me", icon: <Palette className="h-5 w-5 text-blue-600" />, color: "bg-blue-100", activeColor: "bg-blue-200", textColor: "text-blue-700" },
  { id: "learning", name: "Learning", icon: <Lightbulb className="h-5 w-5 text-green-600" />, color: "bg-green-100", activeColor: "bg-green-200", textColor: "text-green-700" },
  { id: "how-i-help", name: "How I Help", icon: <User className="h-5 w-5 text-yellow-600" />, color: "bg-yellow-100", activeColor: "bg-yellow-200", textColor: "text-yellow-700" },
  { id: "projects", name: "Projects", icon: <Rocket className="h-5 w-5 text-red-600" />, color: "bg-red-100", activeColor: "bg-red-200", textColor: "text-red-700" },
]

interface KidFriendlyDashboardProps {
  locale: string
}

export function KidFriendlyDashboard({ locale }: KidFriendlyDashboardProps) {
  const router = useRouter()
  const [memories, setMemories] = useState(mockMemories)
  const [searchQuery, setSearchQuery] = useState("")
  const [newMemory, setNewMemory] = useState({ content: "", type: "Fun Facts" })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState("all")

  const filteredMemories = memories.filter(
    (memory) =>
      (selectedBucket === "all" || memory.type === selectedBucket) &&
      (memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.type.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAddMemory = () => {
    if (newMemory.content.trim()) {
      const bucket = memoryBuckets.find((b) => b.name === newMemory.type)
      const newMemoryObj = {
        id: `kid${memories.length + 1}`,
        content: newMemory.content,
        type: newMemory.type,
        icon: bucket?.icon || <Sparkles className="h-5 w-5 text-gray-600" />,
        color: bucket?.color || "bg-gray-100 border-gray-300",
        textColor: bucket?.textColor || "text-gray-800",
        isStarred: false,
        date: new Date().toISOString(),
      }
      setMemories([newMemoryObj, ...memories]) // Add to the top
      setNewMemory({ content: "", type: "Fun Facts" })
      setIsAddDialogOpen(false)
    }
  }

  const toggleStar = (id: string) => {
    setMemories(memories.map((mem) => (mem.id === id ? { ...mem, isStarred: !mem.isStarred } : mem)))
  }

  const deleteMemory = (id: string) => {
    // Simple confirmation for kids
    if (window.confirm("✨ Poof! ✨ Make this memory disappear?")) {
      setMemories(memories.filter((mem) => mem.id !== id))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 p-1 bg-slate-50 dark:bg-gray-900/30 rounded-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-5 rounded-lg text-white relative shadow-md">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-3 right-3 text-white/80 hover:bg-white/20 hover:text-white h-8 w-8"
          onClick={() => router.push(`/${locale}/mem0/settings`)}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold mb-1">Welcome to Your Memory Journal!</h2>
        <p className="text-sm opacity-90">This is where I keep track of all the cool things I remember about you and your projects!</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Buckets & Secret Keeper */}
        <div className="lg:w-1/4 space-y-6">
          {/* Memory Buckets */}
          <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center text-base font-semibold text-blue-700 dark:text-blue-300">
                <Archive className="mr-2 h-5 w-5" />
                Memory Buckets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-9 text-sm font-medium rounded-md",
                    selectedBucket === "all" ? "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100" : "text-slate-600 dark:text-slate-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
                  )}
                  onClick={() => setSelectedBucket("all")}
                >
                  <span className="mr-2">🌈</span> All Memories
                </Button>

                {memoryBuckets.map((bucket) => (
                  <Button
                    key={bucket.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-9 text-sm font-medium rounded-md",
                      selectedBucket === bucket.name ? `${bucket.activeColor} ${bucket.textColor}` : "text-slate-600 dark:text-slate-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
                    )}
                    onClick={() => setSelectedBucket(bucket.name)}
                  >
                    <span className="mr-2 flex-shrink-0">{bucket.icon}</span> 
                    <span className="truncate">{bucket.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Secret Keeper */}
          <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center text-base font-semibold text-yellow-700 dark:text-yellow-300">
                <Lock className="mr-2 h-5 w-5" />
                Secret Keeper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="remember-facts" className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                   <span className="mr-2 text-yellow-600 dark:text-yellow-400">🔒</span> Remember Facts
                </Label>
                <Switch id="remember-facts" defaultChecked className="[&>span]:bg-yellow-400 data-[state=checked]:bg-yellow-600"/>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="remember-preferences" className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                   <span className="mr-2 text-yellow-600 dark:text-yellow-400">🔒</span> Remember Likes
                </Label>
                <Switch id="remember-preferences" defaultChecked className="[&>span]:bg-yellow-400 data-[state=checked]:bg-yellow-600"/>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="remember-projects" className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                   <span className="mr-2 text-yellow-600 dark:text-yellow-400">🔒</span> Remember Projects
                </Label>
                <Switch id="remember-projects" defaultChecked className="[&>span]:bg-yellow-400 data-[state=checked]:bg-yellow-600"/>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline */}
        <div className="lg:w-3/4 space-y-4">
          {/* Search and Add */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search your memory journal..."
                className="pl-8 bg-white dark:bg-slate-800 h-9 rounded-md border-slate-300 dark:border-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-md h-9">
                  <Gift className="mr-2 h-4 w-4" /> Add Memory
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-center text-blue-700 dark:text-blue-300">Add to Your Memory Journal</DialogTitle>
                  <DialogDescription className="text-center text-sm text-slate-600 dark:text-slate-400">
                    What awesome thing should I remember?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                   <Textarea
                      placeholder="Type your memory here... (e.g., I learned to make pancakes today!) "
                      value={newMemory.content}
                      onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                      className="min-h-[80px] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md"
                   />
                   <div className="space-y-2">
                     <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pick a Memory Bucket:</Label>
                     <div className="flex flex-wrap gap-2">
                       {memoryBuckets.map((bucket) => (
                         <Button
                           key={bucket.id}
                           type="button"
                           variant={newMemory.type === bucket.name ? "default" : "outline"}
                           size="sm"
                           className={cn(
                             "rounded-md border-2 text-xs h-8",
                             newMemory.type === bucket.name
                               ? `${bucket.activeColor} ${bucket.textColor} border-current dark:border-current`
                               : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                           )}
                           onClick={() => setNewMemory({ ...newMemory, type: bucket.name })}
                         >
                           <span className="mr-1.5 flex-shrink-0 scale-90">{bucket.icon}</span> {bucket.name}
                         </Button>
                       ))}
                     </div>
                   </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                     size="sm"
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                    onClick={handleAddMemory}
                    disabled={!newMemory.content.trim()}
                  >
                    Save Memory
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
           {/* Memory Timeline Title */}
           <h3 className="flex items-center text-lg font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="mr-2 h-5 w-5 text-slate-500 dark:text-slate-400" />
              Memory Timeline
           </h3>

          {/* Timeline Items */}
          <div className="space-y-4">
            {filteredMemories.length > 0 ? (
              filteredMemories.map((memory) => (
                <Card key={memory.id} className={cn("overflow-hidden shadow-sm border-2", memory.color, "dark:bg-opacity-10 dark:border-opacity-30")}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", memory.color.replace("bg-", "bg-").replace("-100", "-200"), "dark:bg-opacity-30")}>
                       {memory.icon}
                    </div>
                    <div className="flex-grow">
                       <div className="flex justify-between items-center mb-1">
                          <Badge variant="outline" className={cn("text-xs font-medium border px-2 py-0.5 rounded-full", memory.color.replace("-100", "-300/70"), memory.textColor, "dark:border-opacity-50 dark:bg-opacity-20")}>
                             {memory.type}
                          </Badge>
                          <div className="flex items-center gap-1">
                             <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", memory.textColor, "hover:bg-black/10 dark:hover:bg-white/10")} onClick={() => toggleStar(memory.id)}>
                                <Star className={cn("h-4 w-4", memory.isStarred ? "fill-current text-yellow-500" : "text-slate-400 dark:text-slate-500")}/>
                             </Button>
                             <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50")} onClick={() => deleteMemory(memory.id)}>
                                <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                       </div>
                       <p className={cn("text-sm font-medium", memory.textColor, "dark:text-opacity-90")}>{memory.content}</p>
                       <p className={cn("text-xs mt-1", memory.textColor, "dark:text-opacity-70 opacity-80")}>Added on {formatDate(memory.date)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700">
                 <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                   <Sparkles className="mx-auto h-8 w-8 mb-2 text-slate-400 dark:text-slate-500"/>
                   <p className="text-sm font-medium">No memories found here!</p>
                   <p className="text-xs">Try adjusting your search or adding a new memory.</p>
                 </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
