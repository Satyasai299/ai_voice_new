import React from 'react'
import Agent from "@/components/Agent"
import { getCurrentUser } from "@/lib/actions/auth.action"
import InterviewGenerationForm from "@/components/InterviewGenerationForm"

const page = async () => {

  const user = await getCurrentUser();

  return (
    <>
        <h3>Interview Generation</h3>
        
        <div className="flex flex-col gap-6">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Option 1: Quick Form Generation</h4>
            <p className="text-sm text-gray-600 mb-4">Fill out the form below to quickly generate interview questions.</p>
            <InterviewGenerationForm userId={user?.id!} />
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Option 2: Voice Generation</h4>
            <p className="text-sm text-gray-600 mb-4">Have a conversation with AI to generate interview questions through voice.</p>
            <Agent 
              userName={user?.name!} 
              userId={user?.id} 
              type="generate" 
            />
          </div>
        </div>
    </>
  )
}

export default page