"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/lib/hooks/use-user"
import { supabase } from "@/lib/supabase/browser-client"
import {
  generateUserKnowledgeProfile,
  analyzeStudentFactPatterns,
  type FactType,
  type StudentFact
} from "@/lib/memory/fact-management"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Lightbulb,
  Target,
  ThumbsUp,
  AlertTriangle,
  Sparkles,
  Brain
} from "lucide-react"

// Define type colors as in admin dashboard
const factTypeColors: Record<FactType, string> = {
  preference: "bg-blue-100 text-blue-800 border-blue-200",
  struggle: "bg-red-100 text-red-800 border-red-200",
  goal: "bg-green-100 text-green-800 border-green-200",
  topic_interest: "bg-purple-100 text-purple-800 border-purple-200",
  learning_style: "bg-yellow-100 text-yellow-800 border-yellow-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
}

// Icon mapping for different fact types
const factTypeIcons: Record<FactType, React.ReactNode> = {
  preference: <ThumbsUp className="size-4" />,
  struggle: <AlertTriangle className="size-4" />,
  goal: <Target className="size-4" />,
  topic_interest: <Lightbulb className="size-4" />,
  learning_style: <Brain className="size-4" />,
  other: <BookOpen className="size-4" />
}

type ProfileProps = {
  userId?: string // Optional - if not provided, uses current user
  showControls?: boolean // Whether to show refresh and other controls
}

export default function UserKnowledgeProfile({
  userId,
  showControls = true
}: ProfileProps) {
  const { user } = useUser()
  const [profile, setProfile] = useState<{
    summary: string
    factTypeDistribution: Record<FactType, number>
    totalFacts: number
    recentSubjects: string[]
  } | null>(null)
  const [insights, setInsights] = useState<{
    strengths: string[]
    challenges: string[]
    recommendedApproaches: string[]
    learningPatterns: string[]
    engagementSuggestions: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine which user ID to use
  const targetUserId = userId || user?.id

  // Function to load profile data (no longer wrapped in useCallback)
  async function loadProfileData() {
    if (!targetUserId) return // Early exit if no target user

    setIsLoading(true)
    setError(null)
    try {
      // Load profile summary
      const profileData = await generateUserKnowledgeProfile({
        userId: targetUserId,
        client: supabase
      })
      setProfile(profileData)

      // Load insights from fact patterns
      const insightData = await analyzeStudentFactPatterns({
        userId: targetUserId,
        client: supabase
      })
      setInsights(insightData)
    } catch (err) {
      console.error("Error loading knowledge profile:", err)
      setError("Failed to load knowledge profile. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  // Load profile data on mount or when userId changes
  useEffect(() => {
    if (!targetUserId) return
    loadProfileData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]) // Added loadProfileData to dependency array

  // Calculate distribution percentages for the pie chart visualization
  const calculateDistribution = () => {
    if (!profile || !profile.factTypeDistribution) return []

    const total = profile.totalFacts || 0
    if (total === 0) return []

    return Object.entries(profile.factTypeDistribution).map(
      ([type, count]) => ({
        type: type as FactType,
        count,
        percentage: Math.round((count / total) * 100)
      })
    )
  }

  const factDistribution = calculateDistribution()

  if (!targetUserId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No user selected. Please log in to view your knowledge profile.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 size-12 animate-spin rounded-full border-b-2 border-blue-700"></div>
            <p className="text-gray-500">Loading your knowledge profile...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="py-8 text-center text-red-500">
            <AlertTriangle className="mx-auto mb-2 size-12" />
            <p>{error}</p>
            {showControls && (
              <Button onClick={loadProfileData} className="mt-4">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile || profile.totalFacts === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="py-8 text-center text-gray-500">
            <BookOpen className="mx-auto mb-2 size-12" />
            <p>No learning profile has been created yet.</p>
            <p className="mt-2 text-sm">
              As you interact with the system, we&apos;ll build a personalized
              profile to enhance your learning experience.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Profile</CardTitle>
            <CardDescription>
              Your personalized learning profile based on {profile.totalFacts}{" "}
              facts
            </CardDescription>
          </div>
          {showControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadProfileData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>

      <Tabs defaultValue="summary" className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>
        </div>

        {/* Summary Tab */}
        <TabsContent value="summary" className="px-6 py-4">
          <div className="space-y-4">
            <div className="text-lg leading-relaxed text-gray-700">
              {profile.summary}
            </div>

            {profile.recentSubjects.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-500">
                  Recent Areas of Focus
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.recentSubjects.map(subject => (
                    <Badge
                      key={subject}
                      variant="outline"
                      className="bg-blue-50"
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="px-6 py-4">
          {!insights ? (
            <div className="py-4 text-center text-gray-500">
              No insights available yet.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Strengths */}
              {insights.strengths.length > 0 && (
                <div>
                  <h3 className="text-md mb-2 flex items-center gap-2 font-medium">
                    <Sparkles className="size-4 text-yellow-500" />
                    Strengths
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {insights.strengths.map((strength, i) => (
                      <li key={i} className="text-gray-700">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Challenges */}
              {insights.challenges.length > 0 && (
                <div>
                  <h3 className="text-md mb-2 flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 text-red-500" />
                    Challenges
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {insights.challenges.map((challenge, i) => (
                      <li key={i} className="text-gray-700">
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Learning Patterns */}
              {insights.learningPatterns.length > 0 && (
                <div>
                  <h3 className="text-md mb-2 flex items-center gap-2 font-medium">
                    <Brain className="size-4 text-purple-500" />
                    Learning Patterns
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {insights.learningPatterns.map((pattern, i) => (
                      <li key={i} className="text-gray-700">
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Approaches */}
              {insights.recommendedApproaches.length > 0 && (
                <div>
                  <h3 className="text-md mb-2 flex items-center gap-2 font-medium">
                    <Lightbulb className="size-4 text-yellow-600" />
                    Recommended Learning Approaches
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {insights.recommendedApproaches.map((approach, i) => (
                      <li key={i} className="text-gray-700">
                        {approach}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="px-6 py-4">
          <div className="space-y-6">
            {/* Fact Type Distribution */}
            <div>
              <h3 className="text-md mb-3 font-medium">
                Fact Type Distribution
              </h3>

              {factDistribution.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No distribution data available.
                </div>
              ) : (
                <div className="space-y-3">
                  {factDistribution.map(({ type, count, percentage }) => (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex">
                            {factTypeIcons[type as FactType]}
                          </span>
                          <span className="text-sm font-medium capitalize">
                            {type.replace("_", " ")}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2.5 rounded-full ${factTypeColors[type as FactType].split(" ")[0]}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Distribution (simplified circular representation) */}
            <div className="pt-4">
              <h3 className="text-md mb-4 font-medium">Visual Distribution</h3>

              <div className="flex justify-center">
                <div className="relative size-48">
                  {factDistribution.length > 0 ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {profile.totalFacts}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total Facts
                          </div>
                        </div>
                      </div>

                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        {/* Generate pie chart segments */}
                        {
                          factDistribution.reduce(
                            (acc, { type, percentage }, index) => {
                              // Calculate the segment's position in the circle
                              const startAngle = acc.currentAngle
                              const angle = (percentage / 100) * 360
                              const endAngle = startAngle + angle

                              // Convert angles to radians for SVG path
                              const startRad =
                                (startAngle - 90) * (Math.PI / 180)
                              const endRad = (endAngle - 90) * (Math.PI / 180)

                              // Calculate points on the circle
                              const x1 = 50 + 45 * Math.cos(startRad)
                              const y1 = 50 + 45 * Math.sin(startRad)
                              const x2 = 50 + 45 * Math.cos(endRad)
                              const y2 = 50 + 45 * Math.sin(endRad)

                              // Determine if the arc is more than 180 degrees
                              const largeArcFlag = angle > 180 ? 1 : 0

                              // Generate the SVG path for the segment
                              const path = (
                                <path
                                  key={type}
                                  d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                  className={factTypeColors[type as FactType]
                                    .split(" ")[0]
                                    .replace("bg-", "fill-")
                                    .replace("100", "400")}
                                  stroke="#fff"
                                  strokeWidth="1"
                                />
                              )

                              return {
                                paths: [...acc.paths, path],
                                currentAngle: endAngle
                              }
                            },
                            { paths: [] as React.ReactNode[], currentAngle: 0 }
                          ).paths
                        }
                      </svg>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-500">No data</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CardFooter className="border-t bg-gray-50 px-6 py-3">
        <p className="text-xs text-gray-500">
          This profile is automatically generated from your interactions and
          helps personalize your learning experience.
        </p>
      </CardFooter>
    </Card>
  )
}
