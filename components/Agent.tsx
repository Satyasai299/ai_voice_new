'use client'

import Image from "next/image"
import React, { useEffect, useState } from 'react'
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED'
}

interface SavedMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

const Agent = ({ userName, userId, type, interviewId, feedbackId, questions }: AgentProps) => {

  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);

  const handleGenerateFeedback = async (messages: SavedMessage[]) => {
    console.log("Generate feedback here - messages:", messages);

    if (!messages || messages.length === 0) {
      console.error("No messages to generate feedback from");
      alert("No conversation data found. Cannot generate feedback.");
      router.push("/");
      return;
    }

    try {
      const result = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages
      });

      if(result.success && result.feedbackId){
          console.log("Feedback created successfully:", result.feedbackId);
          router.push(`/interview/${interviewId}/feedback`);
      } else {
          console.error("Error saving feedback:", result.error || "Unknown error");
          alert("Failed to generate feedback. Please try again.");
          router.push("/");
      }
    } catch (error) {
      console.error("Error in handleGenerateFeedback:", error);
      alert("An error occurred while generating feedback. Please try again.");
      router.push("/");
    }
  };

  const handleInterviewGeneration = async (messages: SavedMessage[]) => {
    console.log("Processing interview generation - messages:", messages);

    if (!messages || messages.length === 0) {
      console.error("No messages to process for interview generation");
      alert("No conversation data found. Cannot generate interview.");
      router.push("/");
      return;
    }

    try {
      // Extract interview details from the conversation
      const conversation = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Use AI to extract interview details from the conversation
      const { generateText } = await import('ai');
      const { google } = await import('@ai-sdk/google');
      
      const { text: extractedDetails } = await generateText({
        model: google('gemini-2.0-flash-001'),
        prompt: `Extract interview details from this conversation and return as JSON:
        
        Conversation:
        ${conversation}
        
        Extract the following information:
        - role: The job role mentioned (e.g., "Frontend Developer", "Software Engineer")
        - type: The interview type mentioned (e.g., "Technical", "Behavioral", "Mixed")
        - level: The experience level mentioned (e.g., "Junior", "Mid", "Senior")
        - techstack: The technologies mentioned (comma-separated, e.g., "React, JavaScript, HTML, CSS")
        - amount: Number of questions requested (default to 5 if not specified)
        
        Return only valid JSON in this format:
        {
          "role": "extracted role or default",
          "type": "extracted type or Technical",
          "level": "extracted level or Junior", 
          "techstack": "extracted techstack or React, JavaScript, HTML, CSS",
          "amount": extracted amount or 5
        }`
      });

      const interviewDetails = JSON.parse(extractedDetails);
      console.log("Extracted interview details:", interviewDetails);
      
      // Call the generation API
      const response = await fetch('/api/vapi/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: interviewDetails.type,
          role: interviewDetails.role,
          level: interviewDetails.level,
          techstack: interviewDetails.techstack,
          amount: interviewDetails.amount,
          userid: userId
        })
      });

      const result = await response.json();

      if(result.success){
          console.log("Interview generated successfully");
          alert("Interview generated successfully! Redirecting to home page.");
          router.push("/");
      } else {
          console.error("Error generating interview:", result.error);
          alert("Failed to generate interview. Please try again.");
          router.push("/");
      }
    } catch (error) {
      console.error("Error in handleInterviewGeneration:", error);
      alert("An error occurred while generating interview. Please try again.");
      router.push("/");
    }
  };

  useEffect(() => {
    const onCallStart = () => {
      console.log("Call started");
      setCallStatus(CallStatus.ACTIVE);
    };
    const onCallEnd = () => {
      console.log("Call ended");
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
        console.log("Message received:", message);
        if(message.type === 'transcript' && message.transcriptType === 'final'){
            const newMessage = { role: message.role, content: message.transcript };
            console.log("Adding message to transcript:", newMessage);
            setMessages((prev) => [...prev, newMessage]);
        }
    }

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    const onError = (error: Error) => console.log('Error', error);

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('error', onError);

    return () => {
        vapi.off('call-start', onCallStart);
        vapi.off('call-end', onCallEnd);
        vapi.off('message', onMessage);
        vapi.off('speech-start', onSpeechStart);
        vapi.off('speech-end', onSpeechEnd);
        vapi.off('error', onError);
    }
  }, [])  

  useEffect(() => {
    console.log("useEffect triggered - callStatus:", callStatus, "type:", type, "messages count:", messages.length);
    console.log("Messages content:", messages);

    if(callStatus === CallStatus.FINISHED){
        console.log("Call finished, checking type:", type);
        if(type === "generate"){
            console.log("Type is generate, processing interview generation");
            handleInterviewGeneration(messages);
        } else{
            console.log("Type is interview, generating feedback");
            handleGenerateFeedback(messages);
        }
    }

  }, [messages, callStatus, feedbackId, interviewId, router, type, userId])

  const handleCall = async () => {
    console.log("Starting call - type:", type, "userId:", userId, "interviewId:", interviewId);
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      console.log("Starting generate call with workflow ID:", process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);
      await vapi.start(
        undefined,
        undefined,
        undefined,
        process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
        {
          variableValues: {
            username: userName,
            userid: userId,
          },
        }
      );
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }
      console.log("Starting interview call with questions:", formattedQuestions);
      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  };

  const handleDisconnect = async () => {
    console.log("Manual disconnect triggered");
    console.log("Current messages before disconnect:", messages);
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
    
    // Add a small delay to ensure messages are processed
    setTimeout(() => {
      console.log("Timeout check - messages after disconnect:", messages);
      // Fallback: if useEffect didn't trigger the appropriate action, do it manually
      if (type === "interview" && messages.length > 0) {
        console.log("Fallback: Manually triggering feedback generation");
        handleGenerateFeedback(messages);
      } else if (type === "generate" && messages.length > 0) {
        console.log("Fallback: Manually triggering interview generation");
        handleInterviewGeneration(messages);
      }
    }, 2000);
  }

  const latestMessage = messages[messages.length - 1]?.content;
  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
        <div className="call-view">
            <div className="card-interviewer">
                <div className="avatar">
                    <Image 
                        src="/ai-avatar.png" 
                        alt="vapi" 
                        width={65} 
                        height={54} 
                        className="object-cover" 
                    />
                    {isSpeaking && <span className="animate-speak"/>}
                </div>
                <h3>AI Interviewer</h3>
            </div>

            <div className="card-border">
                <div className="card-content">
                    <Image 
                        src="/user-avatar.png" 
                        alt="user avatar" 
                        width={540} 
                        height={540} 
                        className="rounded-full object-cover size-[120px] "
                    />
                    <h3>{userName}</h3>
                </div>
            </div>
        </div>

        {messages.length > 0 && (
            <div className="transcript-border">
                <div className="transcript">
                    <p key={latestMessage} className={cn("transition-opacity duration-500 opacity-0", "animate-fadeIn opacity-100")}>
                        {latestMessage}
                    </p>
                </div>
            </div>
        )}

        <div className="w-full flex justify-center">
            {callStatus !== "ACTIVE" ? (
                <button className="relative btn-call" onClick={handleCall}>
                    <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== "CONNECTING" && "hidden")}/>
                    
                    <span>
                        {isCallInactiveOrFinished ? "Call" : ". . ."}
                    </span>
                </button>
            ) : (
                <button className="btn-disconnect" onClick={handleDisconnect}>
                    End
                </button>
            )}
        </div>
    </>
    
  )
}

export default Agent