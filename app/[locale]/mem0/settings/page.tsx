"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useRouter, useParams } from "next/navigation"

export default function MemorySettingsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  
  return (
    <main className="container mx-auto min-h-screen p-4">
      <div className="flex flex-col space-y-6 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Memory Settings</h1>
            <p className="text-muted-foreground text-sm">Customize your memory preferences</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => router.push(`/${locale}/mem0`)}
            size="sm"
          >
            Back
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Privacy Controls</CardTitle>
              <CardDescription>Manage what gets stored in your memory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-y-0">
                <Label htmlFor="remember-facts" className="flex flex-col space-y-1">
                  <span>Remember Facts</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    Store information about facts you've learned
                  </span>
                </Label>
                <Switch id="remember-facts" defaultChecked />
              </div>
              <Separator />
              
              <div className="flex items-center justify-between space-y-0">
                <Label htmlFor="remember-preferences" className="flex flex-col space-y-1">
                  <span>Remember Preferences</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    Store information about your likes and dislikes
                  </span>
                </Label>
                <Switch id="remember-preferences" defaultChecked />
              </div>
              <Separator />
              
              <div className="flex items-center justify-between space-y-0">
                <Label htmlFor="remember-projects" className="flex flex-col space-y-1">
                  <span>Remember Projects</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    Store information about your projects and work
                  </span>
                </Label>
                <Switch id="remember-projects" defaultChecked />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Advanced Options</CardTitle>
              <CardDescription>Additional memory settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memory-expiration">Memory Duration (days)</Label>
                <Input id="memory-expiration" type="number" defaultValue={30} />
                <p className="text-muted-foreground text-xs">
                  How long memories should be kept before they fade (0 for never)
                </p>
              </div>
              <Separator />
              
              <Button variant="destructive" size="sm" className="mt-4">
                Reset All Memories
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
} 