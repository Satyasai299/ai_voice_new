import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getRandomInterviewCover } from "@/lib/utils";
import { db } from "@/firebase/admin";

export async function POST(request: Request) {
    try {
        const { conversation, userid } = await request.json();
        console.log("Received request with conversation:", conversation);
        console.log("User ID:", userid);

        if (!conversation || !userid) {
            console.error("Missing required parameters");
            return Response.json({ success: false, error: "Missing conversation or userid" }, { status: 400 });
        }
        // Use AI to extract interview details from the conversation
        console.log("Starting AI extraction...");
        const { text: extractedDetails } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Extract interview details from this conversation and return ONLY valid JSON.

Conversation:
${conversation}

Extract the following information and return ONLY valid JSON (no other text):
- role: The job role mentioned (e.g., "Frontend Developer", "Software Engineer")
- type: The interview type mentioned (e.g., "Technical", "Behavioral", "Mixed")  
- level: The experience level mentioned (e.g., "Junior", "Mid", "Senior")
- techstack: The technologies mentioned (comma-separated, e.g., "React, JavaScript, HTML, CSS")
- amount: Number of questions requested (default to 5 if not specified)

IMPORTANT: Return ONLY this exact JSON format with no additional text, explanations, or formatting:
{"role":"Software Developer","type":"Technical","level":"Junior","techstack":"React, JavaScript, HTML, CSS","amount":5}`
        });

        console.log("Extracted details:", extractedDetails);
        
        // Clean and parse the extracted details
        const cleanedDetails = extractedDetails.trim().replace(/```json|```/g, '').trim();
        console.log("Cleaned details:", cleanedDetails);
        
        let interviewDetails;
        try {
            interviewDetails = JSON.parse(cleanedDetails);
            console.log("Parsed interview details:", interviewDetails);
        } catch (parseError) {
            console.error("Error parsing extracted details:", parseError);
            console.error("Raw extracted details:", extractedDetails);
            console.error("Cleaned details:", cleanedDetails);
            
            // Fallback: try to extract information manually
            console.log("Attempting fallback extraction...");
            interviewDetails = {
                role: "Software Developer",
                type: "Technical", 
                level: "Junior",
                techstack: "React, JavaScript, HTML, CSS",
                amount: 5
            };
            
            // Try to extract role from conversation
            if (conversation.toLowerCase().includes('frontend') || conversation.toLowerCase().includes('front-end')) {
                interviewDetails.role = "Frontend Developer";
            } else if (conversation.toLowerCase().includes('backend') || conversation.toLowerCase().includes('back-end')) {
                interviewDetails.role = "Backend Developer";
            } else if (conversation.toLowerCase().includes('fullstack') || conversation.toLowerCase().includes('full-stack')) {
                interviewDetails.role = "Full Stack Developer";
            }
            
            // Try to extract tech stack
            const techKeywords = ['react', 'javascript', 'html', 'css', 'node', 'python', 'java', 'angular', 'vue'];
            const foundTech = techKeywords.filter(tech => conversation.toLowerCase().includes(tech));
            if (foundTech.length > 0) {
                interviewDetails.techstack = foundTech.join(', ');
            }
            
            console.log("Using fallback interview details:", interviewDetails);
        }

        // Generate questions based on extracted details
        console.log("Starting question generation...");
        const { text: questions } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Generate ${interviewDetails.amount} interview questions for a ${interviewDetails.level} ${interviewDetails.role} position.

Job Details:
- Role: ${interviewDetails.role}
- Level: ${interviewDetails.level}
- Tech Stack: ${interviewDetails.techstack}
- Type: ${interviewDetails.type}

IMPORTANT: Return ONLY a valid JSON array of questions. No other text, explanations, or formatting.

Example format:
["What is your experience with React?", "How do you handle state management?", "Explain the difference between let and const"]

Return exactly ${interviewDetails.amount} questions focused on ${interviewDetails.techstack} and ${interviewDetails.type} topics.`
        });

        console.log("Generated questions text:", questions);
        
        // Clean and parse the questions
        const cleanedQuestions = questions.trim().replace(/```json|```/g, '').trim();
        console.log("Cleaned questions:", cleanedQuestions);
        
        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(cleanedQuestions);
            console.log("Parsed questions:", parsedQuestions);
        } catch (parseError) {
            console.error("Error parsing questions:", parseError);
            console.error("Raw questions:", questions);
            console.error("Cleaned questions:", cleanedQuestions);
            
            // Fallback: create default questions
            console.log("Using fallback questions...");
            parsedQuestions = [
                `What is your experience with ${interviewDetails.techstack.split(',')[0] || 'web development'}?`,
                `How do you approach problem-solving in your development work?`,
                `Can you explain a challenging project you've worked on?`,
                `What are your thoughts on code quality and testing?`,
                `How do you stay updated with new technologies?`
            ].slice(0, interviewDetails.amount);
            
            console.log("Using fallback questions:", parsedQuestions);
        }

        const interview = {
            role: interviewDetails.role,
            type: interviewDetails.type,
            level: interviewDetails.level,
            techstack: interviewDetails.techstack.split(","),
            questions: parsedQuestions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString(),
        }

        console.log("Interview object to save:", interview);
        
        try {
            await db.collection("interviews").add(interview);
            console.log("Interview saved successfully");
        } catch (dbError) {
            console.error("Database error:", dbError);
            return Response.json({ success: false, error: "Failed to save interview to database" }, { status: 500 });
        }

        return Response.json({ success: true, interview }, { status: 200 });
    } catch (error) {
        console.error("Error in extract-and-generate API:", error);
        return Response.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        }, { status: 500 });
    }
}
