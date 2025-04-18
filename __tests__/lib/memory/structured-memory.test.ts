import { extractFactsFromMessages, createFactExtractionChain as originalCreateFactExtractionChain } from '../../../lib/memory/structured-memory'
import type { BaseMessage } from '@langchain/core/messages'
import { HumanMessage } from '@langchain/core/messages'

// Mock the entire module
const mockInvoke = jest.fn()
jest.mock('../../../lib/memory/structured-memory', () => {
  const originalModule = jest.requireActual('../../../lib/memory/structured-memory')
  return {
    ...originalModule,
    createFactExtractionChain: jest.fn() // Provide a base mock function here
  }
})

// Type assertion for the mocked function
const mockedCreateFactExtractionChain = originalCreateFactExtractionChain as jest.Mock;

describe('extractFactsFromMessages', () => {

  beforeAll(() => {
    // Define the mock implementation here, before any tests run
    mockedCreateFactExtractionChain.mockImplementation(() => ({ invoke: mockInvoke }))
  })

  beforeEach(() => {
    // Reset calls and invocation results before each test
    mockInvoke.mockClear()
    mockedCreateFactExtractionChain.mockClear()
  })

  it('returns empty facts when messages array is empty', async () => {
    const result = await extractFactsFromMessages({ messages: [], llmApiKey: 'test-key', modelName: 'test-model' })
    expect(result).toEqual({ facts: [] })
    expect(mockedCreateFactExtractionChain).not.toHaveBeenCalled()
  })

  it('returns facts when chain.invoke returns valid data', async () => {
    const testFacts = [{ fact_type: 'preference', subject: 'math', details: 'likes diagrams' }]
    mockInvoke.mockResolvedValue({ facts: testFacts })

    const messages: BaseMessage[] = [
      new HumanMessage('I enjoy diagrams for learning')
    ]

    const result = await extractFactsFromMessages({ messages, llmApiKey: 'key', modelName: 'model' })

    expect(mockedCreateFactExtractionChain).toHaveBeenCalledWith({ llmApiKey: 'key', modelName: 'model' })
    expect(mockInvoke).toHaveBeenCalledWith({ conversation_text: expect.stringContaining('human: I enjoy diagrams for learning') })
    expect(result).toEqual({ facts: testFacts })
  })

  it('returns empty facts when chain.invoke returns invalid data', async () => {
    mockInvoke.mockResolvedValue({ invalid: true })
    const messages: BaseMessage[] = [ new HumanMessage('test') ]

    const result = await extractFactsFromMessages({ messages, llmApiKey: 'key', modelName: 'model' })
    expect(result).toEqual({ facts: [] })
    expect(mockedCreateFactExtractionChain).toHaveBeenCalledWith({ llmApiKey: 'key', modelName: 'model' })
    expect(mockInvoke).toHaveBeenCalledWith({ conversation_text: expect.stringContaining('human: test') })
  })

  it('returns empty facts when chain.invoke throws an error', async () => {
    mockInvoke.mockRejectedValue(new Error('LLM failure'))
    const messages: BaseMessage[] = [ new HumanMessage('error test') ]

    const result = await extractFactsFromMessages({ messages, llmApiKey: 'key', modelName: 'model' })
    expect(result).toEqual({ facts: [] })
    expect(mockedCreateFactExtractionChain).toHaveBeenCalledWith({ llmApiKey: 'key', modelName: 'model' })
    expect(mockInvoke).toHaveBeenCalledWith({ conversation_text: expect.stringContaining('human: error test') })
  })
}) 