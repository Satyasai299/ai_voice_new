'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

interface InterviewGenerationFormProps {
  userId: string
}

const InterviewGenerationForm = ({ userId }: InterviewGenerationFormProps) => {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    role: '',
    type: 'Technical',
    level: 'Junior',
    techstack: '',
    amount: 5
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      const response = await fetch('/api/vapi/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userid: userId
        })
      })

      const result = await response.json()

      if(result.success){
        alert("Interview generated successfully! Redirecting to home page.")
        router.push("/")
      } else {
        alert("Failed to generate interview. Please try again.")
      }
    } catch (error) {
      console.error("Error generating interview:", error)
      alert("An error occurred while generating interview. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="role">Job Role</Label>
        <Input
          id="role"
          name="role"
          type="text"
          placeholder="e.g., Frontend Developer, Software Engineer"
          value={formData.role}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Interview Type</Label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="Technical">Technical</option>
          <option value="Behavioral">Behavioral</option>
          <option value="Mixed">Mixed</option>
        </select>
      </div>

      <div>
        <Label htmlFor="level">Experience Level</Label>
        <select
          id="level"
          name="level"
          value={formData.level}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="Junior">Junior</option>
          <option value="Mid">Mid</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      <div>
        <Label htmlFor="techstack">Tech Stack (comma-separated)</Label>
        <Input
          id="techstack"
          name="techstack"
          type="text"
          placeholder="e.g., React, JavaScript, HTML, CSS"
          value={formData.techstack}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="amount">Number of Questions</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="1"
          max="20"
          value={formData.amount}
          onChange={handleChange}
          required
        />
      </div>

      <Button 
        type="submit" 
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? "Generating Interview..." : "Generate Interview"}
      </Button>
    </form>
  )
}

export default InterviewGenerationForm
