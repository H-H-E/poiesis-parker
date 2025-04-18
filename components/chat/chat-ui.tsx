import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatFilesByChatId } from "@/db/chat-files"
import { getChatById } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import type { LLMID, MessageImage, ChatMessage, ChatFile } from "@/types"
import type { Tables, TablesUpdate } from "@/supabase/types"
import { useParams } from "next/navigation"
import type { FC } from "react"
import { useContext, useEffect, useState, useRef, useCallback } from "react"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"

type ChatUIProps = Record<string, unknown>

export const ChatUI: FC<ChatUIProps> = () => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()
  const chatId = params?.chatid as string

  const {
    profile,
    chatMessages,
    setChatMessages,
    selectedChat,
    setSelectedChat,
    setChatSettings,
    setChatImages,
    assistants,
    setSelectedAssistant,
    setChatFileItems,
    setChatFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools
  } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000

  const fetchMessages = useCallback(
    async (currentChatId: string) => {
      const fetchedMessages: Tables<"messages">[] =
        await getMessagesByChatId(currentChatId)

      const imagePromises: Promise<MessageImage>[] = fetchedMessages.flatMap(
        (message: Tables<"messages">) =>
          message.image_paths
            ? message.image_paths.map(async (imagePath: string) => {
                const url = await getMessageImageFromStorage(imagePath)

                if (url) {
                  const response = await fetch(url)
                  const blob = await response.blob()
                  const base64 = await convertBlobToBase64(blob)

                  return {
                    messageId: message.id,
                    path: imagePath,
                    base64,
                    url,
                    file: null
                  }
                }

                return {
                  messageId: message.id,
                  path: imagePath,
                  base64: "",
                  url,
                  file: null
                }
              })
            : []
      )

      const images: MessageImage[] = await Promise.all(imagePromises.flat())
      setChatImages(images)

      const messageFileItemPromises = fetchedMessages.map(
        async (message: Tables<"messages">) =>
          await getMessageFileItemsByMessageId(message.id)
      )

      const messageFileItems: {
        id: string
        file_items: Tables<"file_items">[]
      }[] = await Promise.all(messageFileItemPromises)

      const uniqueFileItems: Tables<"file_items">[] = messageFileItems.flatMap(
        item => item.file_items
      )
      setChatFileItems(uniqueFileItems)

      const chatFilesResult = await getChatFilesByChatId(currentChatId)

      const chatFiles: ChatFile[] = chatFilesResult.files.map(
        (file: Tables<"files">) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        })
      )

      setChatFiles(chatFiles)

      setUseRetrieval(true)
      setShowFilesDisplay(true)

      const fetchedChatMessages: ChatMessage[] = fetchedMessages.map(
        (message: Tables<"messages">) => {
          return {
            message,
            fileItems: messageFileItems
              .filter(messageFileItem => messageFileItem.id === message.id)
              .flatMap(messageFileItem =>
                messageFileItem.file_items.map(
                  (fileItem: Tables<"file_items">) => fileItem.id
                )
              )
          }
        }
      )

      setChatMessages(fetchedChatMessages)
    },
    [
      setChatImages,
      setChatFileItems,
      setChatFiles,
      setUseRetrieval,
      setShowFilesDisplay,
      setChatMessages
    ]
  )

  const fetchChat = useCallback(
    async (currentChatId: string) => {
      const chat: Tables<"chats"> | null = await getChatById(currentChatId)
      if (!chat) return

      if (chat.assistant_id) {
        const assistant = assistants.find(
          (assistant: Tables<"assistants">) =>
            assistant.id === chat.assistant_id
        )

        if (assistant) {
          setSelectedAssistant(assistant)

          const assistantToolsResult = await getAssistantToolsByAssistantId(
            assistant.id
          )
          setSelectedTools(assistantToolsResult.tools)
        }
      }

      setSelectedChat(chat)
      setChatSettings({
        model: chat.model as LLMID,
        prompt: chat.prompt,
        temperature: chat.temperature,
        contextLength: chat.context_length,
        includeProfileContext: chat.include_profile_context,
        includeWorkspaceInstructions: chat.include_workspace_instructions,
        embeddingsProvider: chat.embeddings_provider as "openai" | "local"
      })
    },
    [
      assistants,
      setSelectedAssistant,
      setSelectedTools,
      setChatSettings,
      setSelectedChat
    ]
  )

  const triggerMemoryExtraction = useCallback(async () => {
    if (
      !profile?.user_id ||
      !selectedChat?.id ||
      !chatMessages ||
      chatMessages.length === 0
    ) {
      console.log(
        "Memory extraction skipped: Missing profile, selected chat ID, or messages."
      )
      return
    }

    const currentChatId = selectedChat.id
    const currentUserId = profile.user_id

    console.log(
      `Chat ${currentChatId}: Inactivity detected (${INACTIVITY_TIMEOUT_MS / 1000 / 60} min), triggering memory extraction...`
    )

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }

    const messagesToProcess = chatMessages.map((cm: ChatMessage) => ({
      role: cm.message.role,
      content: cm.message.content
    }))

    try {
      const response = await fetch("/api/memory/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUserId,
          chatId: currentChatId,
          messages: messagesToProcess
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Memory extraction failed: ${response.status} ${response.statusText} - ${errorData.message || "Unknown error"}`
        )
      }

      const result = await response.json()
      console.log(
        `Memory extraction successful for chat ${currentChatId}: ${result.count} facts stored.`
      )
    } catch (error) {
      console.error("Error triggering memory extraction:", error)
    }
  }, [profile?.user_id, selectedChat?.id, chatMessages])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    if (selectedChat?.id) {
      inactivityTimerRef.current = setTimeout(
        triggerMemoryExtraction,
        INACTIVITY_TIMEOUT_MS
      )
    }
  }, [selectedChat?.id, triggerMemoryExtraction])

  useEffect(() => {
    resetInactivityTimer()

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, [resetInactivityTimer])

  useEffect(() => {
    if (!selectedChat?.id || isSubmitting) return

    console.log(`Chat ${selectedChat.id}: Loading messages...`)
    setIsLoadingMessages(true)
    setIsChatLoading(true)

    const fetchData = async () => {
      try {
        await fetchChat(selectedChat.id)
        await fetchMessages(selectedChat.id)
        setIsChatLoading(false)
        setIsLoadingMessages(false)
        resetInactivityTimer()
      } catch (error) {
        console.error("Error fetching chat data:", error)
        setIsChatLoading(false)
        setIsLoadingMessages(false)
      }
    }

    fetchData()
  }, [
    selectedChat?.id,
    isSubmitting,
    resetInactivityTimer,
    fetchChat,
    fetchMessages
  ])

  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute left-4 top-2.5 flex justify-center">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      <div className="bg-secondary flex max-h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        <div className="max-w-[200px] truncate sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
          {selectedChat?.name || "Chat"}
        </div>
      </div>

      <div
        className="flex size-full flex-col overflow-auto border-b"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        <ChatMessages />

        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
        <ChatInput />
      </div>

      <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
        <ChatHelp />
      </div>
    </div>
  )
}
