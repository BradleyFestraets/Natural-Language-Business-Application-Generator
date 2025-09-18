import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import VoiceInput from "./VoiceInput";

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: "en-US"
};

const mockSpeechRecognitionConstructor = vi.fn(() => mockSpeechRecognition);

// Mock the global objects
Object.defineProperty(window, 'SpeechRecognition', {
  value: mockSpeechRecognitionConstructor,
  writable: true
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: mockSpeechRecognitionConstructor,
  writable: true
});

describe("VoiceInput Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpeechRecognition.continuous = false;
    mockSpeechRecognition.interimResults = false;
    mockSpeechRecognition.lang = "en-US";
  });

  test("renders voice input button", () => {
    render(<VoiceInput />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    expect(voiceButton).toBeInTheDocument();
    expect(voiceButton).toHaveTextContent("Start Voice Input");
  });

  test("shows not supported message when Speech Recognition is unavailable", () => {
    // Temporarily remove SpeechRecognition to test fallback
    const originalSpeechRecognition = window.SpeechRecognition;
    const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;
    
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(<VoiceInput />);
    
    expect(screen.getByText("Voice input not supported in this browser")).toBeInTheDocument();
    
    // Restore for other tests
    window.SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  test("starts recording when button is clicked", async () => {
    render(<VoiceInput />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(voiceButton).toHaveTextContent("Recording...");
  });

  test("stops recording when button is clicked again", async () => {
    render(<VoiceInput />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    
    // Start recording
    fireEvent.click(voiceButton);
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    
    // Stop recording
    fireEvent.click(voiceButton);
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  test("calls onTranscript with recognized text", async () => {
    const mockOnTranscript = vi.fn();
    render(<VoiceInput onTranscript={mockOnTranscript} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [
          {
            transcript: "Create employee onboarding system",
            confidence: 0.9
          }
        ]
      ],
      resultIndex: 0
    };

    // Get the onresult callback that was set
    const onResultCallback = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResultCallback) {
      onResultCallback(mockEvent);
    }

    expect(mockOnTranscript).toHaveBeenCalledWith("Create employee onboarding system");
  });

  test("handles speech recognition errors gracefully", async () => {
    const mockOnError = vi.fn();
    render(<VoiceInput onError={mockOnError} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    // Simulate error
    const mockErrorEvent = {
      error: "network",
      message: "Network error occurred"
    };

    const onErrorCallback = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1];
    
    if (onErrorCallback) {
      onErrorCallback(mockErrorEvent);
    }

    expect(mockOnError).toHaveBeenCalledWith(mockErrorEvent);
  });

  test("shows interim results during recording", async () => {
    render(<VoiceInput showInterimResults={true} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    expect(mockSpeechRecognition.interimResults).toBe(true);

    // Simulate interim results
    const mockEvent = {
      results: [
        [
          {
            transcript: "Create employee...",
            confidence: 0.5,
            isFinal: false
          }
        ]
      ],
      resultIndex: 0
    };

    const onResultCallback = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResultCallback) {
      onResultCallback(mockEvent);
    }

    await waitFor(() => {
      expect(screen.getByTestId("interim-results")).toBeInTheDocument();
      expect(screen.getByTestId("interim-results")).toHaveTextContent("Create employee...");
    });
  });

  test("supports different languages", () => {
    render(<VoiceInput language="es-ES" />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    expect(mockSpeechRecognition.lang).toBe("es-ES");
  });

  test("handles continuous recording mode", () => {
    render(<VoiceInput continuous={true} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    expect(mockSpeechRecognition.continuous).toBe(true);
  });

  test("displays confidence level when available", async () => {
    render(<VoiceInput showConfidence={true} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    // Simulate high confidence result
    const mockEvent = {
      results: [
        [
          {
            transcript: "Create employee onboarding system",
            confidence: 0.95
          }
        ]
      ],
      resultIndex: 0
    };

    const onResultCallback = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResultCallback) {
      onResultCallback(mockEvent);
    }

    await waitFor(() => {
      expect(screen.getByTestId("confidence-level")).toBeInTheDocument();
      expect(screen.getByTestId("confidence-level")).toHaveTextContent("95%");
    });
  });

  test("clears interim results on final result", async () => {
    render(<VoiceInput showInterimResults={true} />);
    
    const voiceButton = screen.getByTestId("button-voice-input");
    fireEvent.click(voiceButton);

    // First interim result
    const interimEvent = {
      results: [
        [
          {
            transcript: "Create employee...",
            confidence: 0.5,
            isFinal: false
          }
        ]
      ],
      resultIndex: 0
    };

    const onResultCallback = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResultCallback) {
      onResultCallback(interimEvent);
    }

    await waitFor(() => {
      expect(screen.getByTestId("interim-results")).toHaveTextContent("Create employee...");
    });

    // Final result should clear interim
    const finalEvent = {
      results: [
        [
          {
            transcript: "Create employee onboarding system",
            confidence: 0.9,
            isFinal: true
          }
        ]
      ],
      resultIndex: 0
    };

    if (onResultCallback) {
      onResultCallback(finalEvent);
    }

    await waitFor(() => {
      expect(screen.queryByTestId("interim-results")).not.toBeInTheDocument();
    });
  });
});