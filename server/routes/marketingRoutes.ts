
import express from "express";
import { storage } from "../storage";
import { isAIServiceAvailable } from "../config/validation";
import OpenAI from "openai";

const router = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

interface LeadData {
  email: string;
  company: string;
  name: string;
  title: string;
  employees: string;
  industry: string;
  useCase: string;
  timeline: string;
  budget: string;
}

/**
 * Lead capture and qualification endpoint
 */
router.post("/lead", async (req, res) => {
  try {
    const leadData: LeadData = req.body;
    
    // Validate required fields
    const requiredFields = ['email', 'company', 'name'];
    for (const field of requiredFields) {
      if (!leadData[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }
    
    // Lead scoring using AI
    let leadScore = 0;
    let qualificationNotes = "";
    
    if (openai && isAIServiceAvailable()) {
      try {
        const scoringPrompt = `Score this B2B SaaS lead for our Natural Language Business Application Generator platform (targeting Fortune 500):
        
Company: ${leadData.company}
Industry: ${leadData.industry}
Employees: ${leadData.employees}
Title: ${leadData.title}
Use Case: ${leadData.useCase}
Timeline: ${leadData.timeline}
Budget: ${leadData.budget}

Score 0-100 based on:
- Company size (enterprise preferred)
- Industry fit (HR, Finance, Healthcare high value)
- Title seniority (CTO, VP Engineering, etc.)
- Budget alignment ($50K+ annual)
- Timeline urgency

Return JSON: {"score": number, "reasoning": "brief explanation", "priority": "hot|warm|cold"}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: scoringPrompt }],
          temperature: 0.3,
          max_tokens: 300
        });

        const scoring = JSON.parse(response.choices[0]?.message?.content || '{"score": 50, "reasoning": "Standard lead", "priority": "warm"}');
        leadScore = scoring.score;
        qualificationNotes = `Score: ${scoring.score}/100 (${scoring.priority}). ${scoring.reasoning}`;
        
      } catch (aiError) {
        console.error("AI lead scoring failed:", aiError);
        leadScore = 50; // Default score
      }
    }
    
    // Store lead in database
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, you'd store this in your CRM/database
    console.log("🎯 NEW ENTERPRISE LEAD:", {
      id: leadId,
      ...leadData,
      score: leadScore,
      notes: qualificationNotes,
      timestamp: new Date().toISOString(),
      source: 'website'
    });
    
    // Trigger immediate notification for high-value leads
    if (leadScore >= 80) {
      console.log("🔥 HIGH-VALUE LEAD ALERT - IMMEDIATE FOLLOW-UP REQUIRED");
      // In production: send Slack notification, create calendar event, etc.
    }
    
    // Generate personalized follow-up email
    let followupEmail = "";
    if (openai && isAIServiceAvailable()) {
      try {
        const emailPrompt = `Write a personalized follow-up email for this enterprise lead:
        
Lead: ${leadData.name}, ${leadData.title} at ${leadData.company}
Industry: ${leadData.industry}
Use Case: ${leadData.useCase}

Our product: Natural Language Business Application Generator with BMAD methodology
- Generate full-stack applications from natural language descriptions
- Enterprise-grade security and compliance
- <15 minute deployment time
- Fortune 500 ready

Email should:
- Be professional but warm
- Reference their specific use case
- Highlight ROI potential
- Suggest a demo
- Include social proof
- Be concise (under 200 words)`;

        const emailResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: emailPrompt }],
          temperature: 0.4,
          max_tokens: 400
        });

        followupEmail = emailResponse.choices[0]?.message?.content || "";
        
      } catch (emailError) {
        console.error("Email generation failed:", emailError);
      }
    }
    
    res.json({
      success: true,
      leadId,
      score: leadScore,
      priority: leadScore >= 80 ? "hot" : leadScore >= 60 ? "warm" : "cold",
      followupEmail: followupEmail || "Thank you for your interest. We'll be in touch soon!",
      nextSteps: [
        "Demo scheduled within 24 hours",
        "ROI analysis prepared",
        "Technical requirements assessment",
        "Custom proof of concept if qualified"
      ]
    });
    
  } catch (error) {
    console.error("Lead capture error:", error);
    res.status(500).json({ error: "Failed to process lead" });
  }
});

/**
 * ROI Calculator endpoint
 */
router.post("/roi-calculator", async (req, res) => {
  try {
    const { employees, avgDevSalary, devCount, projectsPerYear, timePerProject } = req.body;
    
    // Calculate current costs
    const currentDevCost = devCount * avgDevSalary;
    const hoursPerProject = timePerProject * 40; // weeks to hours
    const totalProjectHours = projectsPerYear * hoursPerProject;
    const currentProjectCost = (totalProjectHours * (avgDevSalary / 2000)); // ~$75/hour avg
    
    // Calculate with our platform (90% time reduction)
    const platformCost = Math.min(employees * 120, 50000); // $120/employee/year, max $50k
    const timeReduction = 0.9;
    const newProjectTime = hoursPerProject * (1 - timeReduction);
    const newProjectCost = (projectsPerYear * newProjectTime * (avgDevSalary / 2000)) + platformCost;
    
    const savings = currentProjectCost - newProjectCost;
    const roi = ((savings - platformCost) / platformCost) * 100;
    const paybackMonths = platformCost / (savings / 12);
    
    res.json({
      current: {
        devCost: currentDevCost,
        projectCost: currentProjectCost,
        totalCost: currentDevCost + currentProjectCost
      },
      withPlatform: {
        platformCost,
        reducedProjectCost: newProjectCost - platformCost,
        totalCost: newProjectCost
      },
      savings: {
        annual: Math.round(savings),
        monthly: Math.round(savings / 12),
        percentage: Math.round(((currentProjectCost - newProjectCost) / currentProjectCost) * 100)
      },
      roi: {
        percentage: Math.round(roi),
        paybackMonths: Math.max(1, Math.round(paybackMonths)),
        threeYearValue: Math.round(savings * 3 - platformCost * 3)
      },
      productivity: {
        timeReduction: "90%",
        projectsEnabled: Math.round(projectsPerYear / (1 - timeReduction)),
        devHoursFreed: Math.round(totalProjectHours * timeReduction)
      }
    });
    
  } catch (error) {
    console.error("ROI calculation error:", error);
    res.status(500).json({ error: "ROI calculation failed" });
  }
});

/**
 * Demo request endpoint
 */
router.post("/demo-request", async (req, res) => {
  try {
    const { email, company, preferredTime, useCase, stakeholders } = req.body;
    
    const demoId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log demo request
    console.log("📅 DEMO REQUEST:", {
      id: demoId,
      email,
      company,
      preferredTime,
      useCase,
      stakeholders,
      timestamp: new Date().toISOString()
    });
    
    // Generate demo agenda based on use case
    let demoAgenda = [
      "Platform overview and value proposition",
      "Live application generation demonstration", 
      "BMAD methodology walkthrough",
      "Enterprise security and compliance features",
      "Pricing and implementation timeline",
      "Q&A and next steps"
    ];
    
    if (openai && isAIServiceAvailable()) {
      try {
        const agendaPrompt = `Customize this demo agenda for: ${company} - ${useCase}
        
        Standard agenda: ${demoAgenda.join(', ')}
        
        Tailor the agenda to emphasize the most relevant aspects for their use case.
        Return as JSON array of strings.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: agendaPrompt }],
          temperature: 0.3,
          max_tokens: 300
        });

        const customAgenda = JSON.parse(response.choices[0]?.message?.content || '[]');
        if (customAgenda.length > 0) {
          demoAgenda = customAgenda;
        }
        
      } catch (error) {
        console.error("Demo agenda customization failed:", error);
      }
    }
    
    res.json({
      success: true,
      demoId,
      scheduledWithin: "4 hours",
      agenda: demoAgenda,
      preparationItems: [
        "Sample data from your current applications",
        "List of current development challenges", 
        "Technical requirements and constraints",
        "Key stakeholder availability"
      ],
      demoEnvironment: "Live production environment with real application generation",
      expectedOutcome: "Working prototype of your specific use case generated live"
    });
    
  } catch (error) {
    console.error("Demo request error:", error);
    res.status(500).json({ error: "Demo request failed" });
  }
});

export { router as marketingRouter };
