import { useEffect, useState } from "react"

const ChatSettings = () => {
  const [chatSettings, setChatSettings] = useState({})

  useEffect(() => {
    const storedSettings = localStorage.getItem("chatSettings")
    if (storedSettings) {
      setChatSettings(JSON.parse(storedSettings))
    }
  }, [])

  return <div>Chat Settings Component</div>
}

export default ChatSettings
