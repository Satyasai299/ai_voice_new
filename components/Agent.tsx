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
  const [hasProcessed, setHasProcessed] = useState(false);

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
      
      // Call the new API endpoint that handles extraction and generation on the server
      const response = await fetch('/api/vapi/extract-and-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: conversation,
          userid: userId
        })
      });

      const result = await response.json();
      console.log("API response:", result);

      if(result.success){
          console.log("Interview generated successfully:", result.interview);
          alert("Interview generated successfully! Redirecting to home page.");
          router.push("/");
      } else {
          console.error("Error generating interview:", result.error);
          const errorMessage = result.error || "Unknown error occurred";
          alert(`Failed to generate interview: ${errorMessage}. Please try again.`);
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
    console.log("useEffect triggered - callStatus:", callStatus, "type:", type, "messages count:", messages.length, "hasProcessed:", hasProcessed);

    if(callStatus === CallStatus.FINISHED && !hasProcessed && messages.length > 0){
        console.log("Call finished, processing...");
        setHasProcessed(true);
        if(type === "generate"){
            console.log("Type is generate, processing interview generation");
            handleInterviewGeneration(messages);
        } else{
            console.log("Type is interview, generating feedback");
            handleGenerateFeedback(messages);
        }
    }

  }, [callStatus, hasProcessed, messages.length, type, feedbackId, interviewId, router, userId])

  const handleCall = async () => {
    console.log("Starting call - type:", type, "userId:", userId, "interviewId:", interviewId);
    console.log("Questions received:", questions);
    setHasProcessed(false);
    setMessages([]);
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      console.log("Starting generate call - using interviewer assistant for question collection");
      // Use the interviewer assistant but with a different prompt for generation
      await vapi.start(interviewer, {
        variableValues: {
          questions: `Please help me collect information to generate interview questions. Ask the user about:
1. What job role they want to practice for (e.g., Frontend Developer, Software Engineer)
2. What type of interview they prefer (Technical, Behavioral, or Mixed)
3. What experience level (Junior, Mid, or Senior)
4. What technologies/tech stack they want to focus on
5. How many questions they want (1-20)

Be conversational and friendly. Once you have all the information, thank them and end the call.`,
        },
      });
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }
      console.log("Starting interview call with questions:", formattedQuestions);
      console.log("Number of questions:", questions?.length || 0);
      console.log("Raw questions array:", questions);
      
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
    vapi.stop();
    // Give vapi a moment to trigger call-end event
    setTimeout(() => {
      setCallStatus(CallStatus.FINISHED);
    }, 100);
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
                        src="/user_avatar.jpg" 
                        alt="user avatar" 
                        width={590} 
                        height={540} 
                        className="rounded-full object-cover size-[120px] "
                    />
                    <h3>{userName}</h3>
                </div>
            </div>
        </div>

        {messages.length > 0 && (
            <div className="transcript-border mb-2 mt-5">
                <div className="transcript ">
                    <p key={latestMessage} className={cn("transition-opacity duration-500 opacity-0", "animate-fadeIn opacity-100")}>
                        {latestMessage}
                    </p>
                </div>
            </div>
        )}

        <div className="w-full flex justify-center">
            {callStatus !== "ACTIVE" ? (
                <button className="relative btn-call mt-5" onClick={handleCall}>
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