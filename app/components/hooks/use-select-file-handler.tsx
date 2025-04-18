import React, { useEffect } from "react"

const useSelectFileHandler = (
  onFilesSelected: (files: File[]) => void,
  handleFilesToAccept: ((file: File) => boolean)[]
) => {
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (items) {
        const files: File[] = []
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === "file") {
            const file = items[i].getAsFile()
            if (file && handleFilesToAccept.some(accept => accept(file))) {
              files.push(file)
            }
          }
        }
        if (files.length > 0) {
          onFilesSelected(files)
          event.preventDefault()
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [onFilesSelected, handleFilesToAccept])
}

export default useSelectFileHandler
