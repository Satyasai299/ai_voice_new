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

      if (result.success) {
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
    <form onSubmit={handleSubmit} className="space-y-4 mb-5">
      <div>
        <Label htmlFor="role" className=' text-indigo-200 pb-2'>Job Role</Label>
        <Input  className='text-indigo-200'
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
        <Label htmlFor="type" className=' text-indigo-200 pb-2'>Interview Type</Label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full p-2 border rounded-md  text-indigo-200"
        >
          <option value="Technical" className='bg-gray-700'>Technical</option>
          <option value="Behavioral" className='bg-gray-700'>Behavioral</option>
          <option value="Mixed" className='bg-gray-700'>Mixed</option>
        </select>
      </div>

      <div>
        <Label htmlFor="level" className=' text-indigo-200 pb-2'>Experience Level</Label>
        <select 
          id="level"
          name="level"
          value={formData.level}
          onChange={handleChange}
          className="w-full p-2 border border-gray-700 rounded-md  text-indigo-200"
        >
          <option value="Junior" className='bg-gray-700' >Junior</option>
          <option value="Mid"className='bg-gray-700'>Mid</option>
          <option value="Senior"className='bg-gray-700'>Senior</option>
        </select>
      </div>

      <div>
        <Label htmlFor="techstack" className=' text-indigo-200 pb-2'>Tech Stack (comma-separated)</Label>
        <Input className='text-indigo-200'
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
        <Label htmlFor="amount" className=' text-indigo-200 pb-2'>Number of Questions</Label>
        <Input className='text-indigo-200'
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
        className="w-full  text-indigo-800"
      >
        {isGenerating ? "Generating Interview..." : "Generate Interview"}
      </Button>
    </form>
  )
}

export default InterviewGenerationForm
